#include "RpcServer.h"

#include <poll.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/un.h>
#include <unistd.h>

#include <cerrno>
#include <cstdlib>
#include <cstring>
#include <map>

namespace musio {

namespace {
constexpr int kMaxClients = 16;
constexpr std::size_t kMaxLineBytes = 8u * 1024u * 1024u;  // guards against a runaway peer
}  // namespace

RpcServer::RpcServer() = default;

RpcServer::~RpcServer() { stop(); }

std::string RpcServer::defaultSocketPath() {
  if (const char* runtimeDir = std::getenv("XDG_RUNTIME_DIR")) {
    if (*runtimeDir != '\0') return std::string(runtimeDir) + "/musio-engine.sock";
  }
  return "/tmp/musio-engine.sock";
}

bool RpcServer::start(const std::string& socketPath, Handler handler, std::string& error) {
  stop();

  socketPath_ = socketPath;
  handler_ = std::move(handler);

  if (socketPath_.size() >= sizeof(sockaddr_un::sun_path)) {
    error = "socket path too long: " + socketPath_;
    return false;
  }

  listenFd_ = ::socket(AF_UNIX, SOCK_STREAM, 0);
  if (listenFd_ < 0) {
    error = "socket() failed: " + std::string(std::strerror(errno));
    return false;
  }

  // A socket file left behind by a crashed engine would make bind() fail with
  // EADDRINUSE even though nobody is listening.
  ::unlink(socketPath_.c_str());

  sockaddr_un addr{};
  addr.sun_family = AF_UNIX;
  std::strncpy(addr.sun_path, socketPath_.c_str(), sizeof(addr.sun_path) - 1);

  if (::bind(listenFd_, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) != 0) {
    error = "bind(" + socketPath_ + ") failed: " + std::strerror(errno);
    ::close(listenFd_);
    listenFd_ = -1;
    return false;
  }

  // Owner-only: the socket is the engine's full control surface.
  ::chmod(socketPath_.c_str(), 0600);

  if (::listen(listenFd_, kMaxClients) != 0) {
    error = "listen() failed: " + std::string(std::strerror(errno));
    ::close(listenFd_);
    listenFd_ = -1;
    ::unlink(socketPath_.c_str());
    return false;
  }

  // Self-pipe so stop() can interrupt poll() immediately instead of waiting for
  // a timeout to expire.
  if (::pipe(wakeupPipe_) != 0) {
    error = "pipe() failed: " + std::string(std::strerror(errno));
    ::close(listenFd_);
    listenFd_ = -1;
    ::unlink(socketPath_.c_str());
    return false;
  }

  shouldStop_.store(false, std::memory_order_release);
  running_.store(true, std::memory_order_release);
  thread_ = std::thread([this] { serveLoop(); });
  return true;
}

void RpcServer::stop() {
  if (!running_.load(std::memory_order_acquire) && !thread_.joinable()) {
    if (listenFd_ >= 0) {
      ::close(listenFd_);
      listenFd_ = -1;
    }
    return;
  }

  shouldStop_.store(true, std::memory_order_release);

  if (wakeupPipe_[1] >= 0) {
    const char byte = 'x';
    const ssize_t ignored = ::write(wakeupPipe_[1], &byte, 1);
    (void)ignored;
  }

  if (thread_.joinable()) thread_.join();

  for (int& fd : wakeupPipe_) {
    if (fd >= 0) {
      ::close(fd);
      fd = -1;
    }
  }

  if (listenFd_ >= 0) {
    ::close(listenFd_);
    listenFd_ = -1;
  }

  if (!socketPath_.empty()) ::unlink(socketPath_.c_str());
  running_.store(false, std::memory_order_release);
}

void RpcServer::handleLine(int clientFd, const std::string& line) {
  Json response = Json::object();
  response["jsonrpc"] = "2.0";

  const Json request = Json::parse(line, nullptr, /*allow_exceptions=*/false);

  if (request.is_discarded() || !request.is_object()) {
    response["error"] = Json::object({{"code", -32700}, {"message", "parse error"}});
    response["id"] = nullptr;
  } else {
    response["id"] = request.contains("id") ? request.at("id") : Json(nullptr);

    const std::string method =
        (request.contains("method") && request.at("method").is_string())
            ? request.at("method").get<std::string>()
            : std::string{};
    const Json params =
        request.contains("params") && request.at("params").is_object()
            ? request.at("params")
            : Json::object();

    if (method.empty()) {
      response["error"] =
          Json::object({{"code", -32600}, {"message", "missing 'method'"}});
    } else if (!handler_) {
      response["error"] =
          Json::object({{"code", -32603}, {"message", "no handler installed"}});
    } else {
      // A throwing handler must not take the engine down with it.
      try {
        Json result = handler_(method, params);
        if (result.is_object() && result.contains("__error")) {
          response["error"] = Json::object(
              {{"code", -32000}, {"message", result.at("__error").get<std::string>()}});
        } else {
          response["result"] = std::move(result);
        }
      } catch (const std::exception& e) {
        response["error"] =
            Json::object({{"code", -32603}, {"message", std::string(e.what())}});
      }
    }
  }

  std::string out = response.dump();
  out.push_back('\n');

  std::size_t sent = 0;
  while (sent < out.size()) {
    const ssize_t n = ::send(clientFd, out.data() + sent, out.size() - sent, MSG_NOSIGNAL);
    if (n <= 0) return;  // peer gone; the poll loop will reap it
    sent += static_cast<std::size_t>(n);
  }
}

void RpcServer::serveLoop() {
  std::map<int, std::string> pending;  // per-client partial line buffer

  while (!shouldStop_.load(std::memory_order_acquire)) {
    std::vector<pollfd> fds;
    fds.push_back({listenFd_, POLLIN, 0});
    fds.push_back({wakeupPipe_[0], POLLIN, 0});
    for (const auto& [fd, _] : pending) fds.push_back({fd, POLLIN, 0});

    const int ready = ::poll(fds.data(), static_cast<nfds_t>(fds.size()), -1);
    if (ready < 0) {
      if (errno == EINTR) continue;
      break;
    }

    if ((fds[1].revents & POLLIN) != 0) break;  // stop() woke us

    if ((fds[0].revents & POLLIN) != 0) {
      const int clientFd = ::accept(listenFd_, nullptr, nullptr);
      if (clientFd >= 0) {
        if (pending.size() >= static_cast<std::size_t>(kMaxClients)) {
          ::close(clientFd);
        } else {
          pending.emplace(clientFd, std::string{});
        }
      }
    }

    std::vector<int> toClose;

    for (std::size_t i = 2; i < fds.size(); ++i) {
      if ((fds[i].revents & (POLLIN | POLLHUP | POLLERR)) == 0) continue;

      const int fd = fds[i].fd;
      char buffer[4096];
      const ssize_t n = ::recv(fd, buffer, sizeof(buffer), 0);

      if (n <= 0) {
        toClose.push_back(fd);
        continue;
      }

      auto it = pending.find(fd);
      if (it == pending.end()) continue;
      it->second.append(buffer, static_cast<std::size_t>(n));

      if (it->second.size() > kMaxLineBytes) {
        toClose.push_back(fd);
        continue;
      }

      // Drain every complete line in the buffer.
      std::size_t newline;
      while ((newline = it->second.find('\n')) != std::string::npos) {
        std::string line = it->second.substr(0, newline);
        it->second.erase(0, newline + 1);
        if (!line.empty() && line.back() == '\r') line.pop_back();
        if (!line.empty()) handleLine(fd, line);
      }
    }

    for (const int fd : toClose) {
      ::close(fd);
      pending.erase(fd);
    }
  }

  for (const auto& [fd, _] : pending) ::close(fd);
  running_.store(false, std::memory_order_release);
}

}  // namespace musio
