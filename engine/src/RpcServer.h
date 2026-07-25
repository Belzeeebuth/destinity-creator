// Newline-delimited JSON-RPC over a Unix domain socket.
//
// This is the low-rate half of the IPC: transport commands, project load/save,
// plugin scans, device selection. Meters and the play head do NOT come through
// here -- 60 Hz telemetry for 256 tracks as JSON would be absurd, so those go
// through the shared-memory block instead (see musio/MeterRing.h).
//
// Framing is one JSON object per line, which any language can speak with a line
// reader and a JSON parser. A Unix socket rather than TCP: no port to collide,
// and filesystem permissions do the access control.
#pragma once

#include <atomic>
#include <functional>
#include <string>
#include <thread>
#include <vector>

#include <nlohmann/json.hpp>

namespace musio {

using Json = nlohmann::json;

class RpcServer {
 public:
  /// Handles one request and returns the response body. Called on the server
  /// thread, one request at a time -- implementations do not need their own
  /// locking against each other, only against the audio thread.
  using Handler = std::function<Json(const std::string& method, const Json& params)>;

  RpcServer();
  ~RpcServer();

  /// Bind and start listening. Removes a stale socket file if one is left over
  /// from a crashed engine.
  bool start(const std::string& socketPath, Handler handler, std::string& error);
  void stop();

  bool isRunning() const { return running_.load(std::memory_order_acquire); }
  const std::string& socketPath() const { return socketPath_; }

  /// Default socket location: $XDG_RUNTIME_DIR/musio-engine.sock, falling back
  /// to /tmp when the runtime dir is not set.
  static std::string defaultSocketPath();

 private:
  void serveLoop();
  void handleLine(int clientFd, const std::string& line);

  std::string socketPath_;
  Handler handler_;
  int listenFd_ = -1;
  int wakeupPipe_[2] = {-1, -1};
  std::thread thread_;
  std::atomic<bool> running_{false};
  std::atomic<bool> shouldStop_{false};
};

}  // namespace musio
