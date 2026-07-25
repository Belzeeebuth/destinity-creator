#include "musio/MeterRing.h"

#include <fcntl.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>

#include <cerrno>
#include <cstring>
#include <new>

namespace musio {

namespace {
constexpr std::size_t kBlockSize = sizeof(MeterBlock);

std::string normaliseName(const std::string& name) {
  // shm_open wants a leading slash and no other slashes.
  std::string n = name;
  if (n.empty()) n = "musio-engine";
  if (n.front() != '/') n.insert(n.begin(), '/');
  return n;
}
}  // namespace

// ---------------------------------------------------------------------------
// MeterWriter
// ---------------------------------------------------------------------------

MeterWriter::~MeterWriter() { close(); }

bool MeterWriter::open(const std::string& name, std::string& error) {
  close();

  const std::string shmName = normaliseName(name);

  // O_TRUNC so a stale segment from a crashed engine is reset rather than
  // reused with garbage in it.
  const int fd = ::shm_open(shmName.c_str(), O_CREAT | O_RDWR | O_TRUNC, 0600);
  if (fd < 0) {
    error = "shm_open(" + shmName + ") failed: " + std::strerror(errno);
    return false;
  }

  if (::ftruncate(fd, static_cast<off_t>(kBlockSize)) != 0) {
    error = "ftruncate failed: " + std::string(std::strerror(errno));
    ::close(fd);
    ::shm_unlink(shmName.c_str());
    return false;
  }

  void* addr = ::mmap(nullptr, kBlockSize, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
  ::close(fd);
  if (addr == MAP_FAILED) {
    error = "mmap failed: " + std::string(std::strerror(errno));
    ::shm_unlink(shmName.c_str());
    return false;
  }

  block_ = new (addr) MeterBlock();
  mappedSize_ = kBlockSize;
  name_ = shmName;
  owner_ = true;
  return true;
}

void MeterWriter::close() {
  if (block_ != nullptr) {
    ::munmap(static_cast<void*>(block_), mappedSize_);
    block_ = nullptr;
    mappedSize_ = 0;
  }
  if (owner_ && !name_.empty()) {
    ::shm_unlink(name_.c_str());
    owner_ = false;
  }
  name_.clear();
}

void MeterWriter::publish(const MeterPayload& payload) noexcept {
  if (block_ == nullptr) return;

  // Seqlock write side. Odd sequence == "torn, do not read".
  //
  // The release fence after marking the sequence odd keeps that store ahead of
  // the payload writes; the release *store* at the end keeps the payload writes
  // ahead of marking it even again. Both directions matter -- a reader that sees
  // an even sequence must be guaranteed to see the payload that went with it.
  const std::uint32_t seq = block_->sequence.load(std::memory_order_relaxed);
  block_->sequence.store(seq + 1, std::memory_order_relaxed);
  std::atomic_thread_fence(std::memory_order_release);

  block_->payload = payload;

  block_->sequence.store(seq + 2, std::memory_order_release);
}

// ---------------------------------------------------------------------------
// MeterReader
// ---------------------------------------------------------------------------

MeterReader::~MeterReader() { close(); }

bool MeterReader::open(const std::string& name, std::string& error) {
  close();

  const std::string shmName = normaliseName(name);

  const int fd = ::shm_open(shmName.c_str(), O_RDONLY, 0);
  if (fd < 0) {
    error = "shm_open(" + shmName + ") failed: " + std::strerror(errno);
    return false;
  }

  void* addr = ::mmap(nullptr, kBlockSize, PROT_READ, MAP_SHARED, fd, 0);
  ::close(fd);
  if (addr == MAP_FAILED) {
    error = "mmap failed: " + std::string(std::strerror(errno));
    return false;
  }

  const auto* candidate = static_cast<const MeterBlock*>(addr);
  if (candidate->magic != MeterBlock::kMagic || candidate->version != MeterBlock::kVersion) {
    error = "shared memory block has wrong magic/version (engine mismatch?)";
    ::munmap(addr, kBlockSize);
    return false;
  }

  block_ = candidate;
  mappedSize_ = kBlockSize;
  return true;
}

void MeterReader::close() {
  if (block_ != nullptr) {
    ::munmap(const_cast<void*>(static_cast<const void*>(block_)), mappedSize_);
    block_ = nullptr;
    mappedSize_ = 0;
  }
}

bool MeterReader::read(MeterPayload& out, int maxRetries) const noexcept {
  if (block_ == nullptr) return false;

  for (int attempt = 0; attempt < maxRetries; ++attempt) {
    // Acquire on the way in: the payload copy below must not be hoisted above
    // this load. An acquire fence between the copy and the second load stops the
    // copy sinking below it. Together they pin the copy between the two reads of
    // the sequence, which is what makes the equality check meaningful.
    const std::uint32_t before = block_->sequence.load(std::memory_order_acquire);
    if ((before & 1u) != 0u) continue;  // writer mid-update

    out = block_->payload;

    std::atomic_thread_fence(std::memory_order_acquire);
    const std::uint32_t after = block_->sequence.load(std::memory_order_relaxed);
    if (before == after) return true;
  }

  return false;
}

}  // namespace musio
