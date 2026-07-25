// Shared-memory telemetry block: play head, meters, xrun counters.
//
// This is the high-rate half of the IPC. Sending 60 Hz meter updates for 256
// tracks as JSON-RPC would be absurd, so the engine publishes a snapshot into
// POSIX shared memory and the UI polls it. Written by exactly one thread (the
// audio thread), read by any number of processes.
//
// Synchronisation is a seqlock, not a mutex: the writer bumps an odd sequence
// number, writes, then bumps it even. A reader takes the sequence before and
// after its copy and retries if they differ or if it was odd. That keeps the
// audio thread free of any blocking primitive -- the worst case is that a
// *reader* retries.
#pragma once

#include <atomic>
#include <cstdint>
#include <string>
#include <type_traits>

#include "musio/Types.h"

namespace musio {

/// Plain-old-data telemetry payload. Must stay trivially copyable and free of
/// pointers: it lives in memory mapped into two different address spaces.
struct MeterPayload {
  std::int64_t playHeadSamples = 0;
  double sampleRate = 48000.0;
  double tempoBpm = 120.0;
  double positionInBeats = 0.0;
  std::uint32_t isPlaying = 0;
  std::uint32_t loopEnabled = 0;
  std::int64_t loopStartSamples = 0;
  std::int64_t loopEndSamples = 0;

  std::uint32_t trackCount = 0;
  float trackPeak[kMaxTracks]{};
  float trackRms[kMaxTracks]{};

  float masterPeakL = 0.0f;
  float masterPeakR = 0.0f;
  float masterRmsL = 0.0f;
  float masterRmsR = 0.0f;

  double cpuLoad = 0.0;          ///< 0..1, audio callback time / budget
  std::uint64_t xrunCount = 0;
  std::uint64_t callbackCount = 0;
  std::uint32_t bufferSize = 0;
  std::uint32_t droppedCommands = 0;  ///< non-zero means the queue overflowed
};

static_assert(std::is_trivially_copyable_v<MeterPayload>);

/// Seqlock-wrapped payload as it physically sits in shared memory.
struct MeterBlock {
  static constexpr std::uint32_t kMagic = 0x4D55534Fu;  // 'MUSO'
  static constexpr std::uint32_t kVersion = 1;

  std::uint32_t magic = kMagic;
  std::uint32_t version = kVersion;
  std::atomic<std::uint32_t> sequence{0};
  std::uint32_t reserved = 0;
  MeterPayload payload{};
};

/// Writer side, used by the audio thread. Never blocks.
class MeterWriter {
 public:
  ~MeterWriter();

  /// Create (or replace) the shared-memory segment. `name` is a POSIX shm
  /// name; it appears at /dev/shm/<name>. Returns false and fills `error` on
  /// failure -- in which case publish() degrades to a no-op and the engine can
  /// still run headless.
  bool open(const std::string& name, std::string& error);
  void close();

  bool isOpen() const noexcept { return block_ != nullptr; }
  const std::string& name() const noexcept { return name_; }

  /// Publish a snapshot. Realtime-safe: two relaxed stores, one memcpy, no
  /// syscall.
  void publish(const MeterPayload& payload) noexcept;

 private:
  MeterBlock* block_ = nullptr;
  std::size_t mappedSize_ = 0;
  std::string name_;
  bool owner_ = false;
};

/// Reader side, used by the UI process (and by the tests).
class MeterReader {
 public:
  ~MeterReader();

  bool open(const std::string& name, std::string& error);
  void close();
  bool isOpen() const noexcept { return block_ != nullptr; }

  /// Consistent copy of the payload. Returns false if it could not get a
  /// tear-free read within `maxRetries`.
  bool read(MeterPayload& out, int maxRetries = 64) const noexcept;

 private:
  const MeterBlock* block_ = nullptr;
  std::size_t mappedSize_ = 0;
};

}  // namespace musio
