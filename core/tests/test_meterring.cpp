#include "TestFramework.h"
#include "musio/MeterRing.h"

#include <unistd.h>

#include <atomic>
#include <string>
#include <thread>

using namespace musio;

namespace {
std::string uniqueName(const char* suffix) {
  return "musio-test-" + std::to_string(::getpid()) + "-" + suffix;
}
}  // namespace

MUSIO_TEST(meterring, writer_and_reader_round_trip) {
  const std::string name = uniqueName("rt");

  MeterWriter writer;
  std::string error;
  if (!writer.open(name, error)) {
    // /dev/shm can be unavailable in a locked-down container. Publishing must
    // degrade to a no-op rather than take the engine down, so verify that and
    // skip the rest.
    MeterWriter degraded;
    MeterPayload p{};
    degraded.publish(p);  // must not crash when unopened
    std::printf("        (skipped: shm unavailable: %s)\n", error.c_str());
    return;
  }

  MeterPayload out{};
  out.playHeadSamples = 123456;
  out.tempoBpm = 137.5;
  out.isPlaying = 1;
  out.trackCount = 3;
  out.trackPeak[0] = 0.25f;
  out.trackPeak[2] = 0.75f;
  out.masterPeakL = 0.5f;
  writer.publish(out);

  MeterReader reader;
  CHECK(reader.open(name, error));

  MeterPayload in{};
  CHECK(reader.read(in));
  CHECK_EQ(in.playHeadSamples, 123456);
  CHECK_NEAR(in.tempoBpm, 137.5, 1e-9);
  CHECK_EQ(static_cast<int>(in.isPlaying), 1);
  CHECK_EQ(static_cast<int>(in.trackCount), 3);
  CHECK_NEAR(in.trackPeak[0], 0.25, 1e-6);
  CHECK_NEAR(in.trackPeak[2], 0.75, 1e-6);
  CHECK_NEAR(in.masterPeakL, 0.5, 1e-6);
}

MUSIO_TEST(meterring, reader_fails_cleanly_on_missing_segment) {
  MeterReader reader;
  std::string error;
  CHECK(!reader.open(uniqueName("does-not-exist"), error));
  CHECK(!error.empty());
  MeterPayload p{};
  CHECK(!reader.read(p));
}

MUSIO_TEST(meterring, publish_on_closed_writer_is_a_noop) {
  MeterWriter writer;
  CHECK(!writer.isOpen());
  MeterPayload p{};
  p.playHeadSamples = 7;
  writer.publish(p);  // must not crash
  CHECK(!writer.isOpen());
}

// The seqlock's job is to guarantee a reader never observes a half-written
// payload. Hammer it: the writer publishes internally-consistent snapshots and
// the reader checks the invariant holds on every successful read.
MUSIO_TEST(meterring, concurrent_reads_are_never_torn) {
  const std::string name = uniqueName("tear");

  MeterWriter writer;
  std::string error;
  if (!writer.open(name, error)) {
    std::printf("        (skipped: shm unavailable)\n");
    return;
  }

  MeterReader reader;
  CHECK(reader.open(name, error));

  std::atomic<bool> stop{false};
  std::atomic<int> tornReads{0};
  std::atomic<int> okReads{0};

  std::thread writerThread([&] {
    // Numbering starts at 1 so that playHeadSamples == 0 unambiguously means
    // "never published". The pristine block is not all zeros -- MeterPayload
    // default-initialises tempoBpm to 120 and sampleRate to 48000 -- so the
    // reader has to be able to tell the initial state apart from a snapshot
    // rather than assume the invariant holds before the first publish.
    for (std::int64_t i = 1; i <= 300000 && !stop.load(std::memory_order_relaxed); ++i) {
      MeterPayload p{};
      // Every field is derived from i, so any mismatch means a torn read.
      p.playHeadSamples = i;
      p.tempoBpm = static_cast<double>(i);
      p.trackCount = static_cast<std::uint32_t>(i & 0xFF);
      p.masterPeakL = static_cast<float>(i & 0xFF);
      p.trackPeak[0] = static_cast<float>(i & 0xFF);
      writer.publish(p);
    }
    stop.store(true, std::memory_order_release);
  });

  while (!stop.load(std::memory_order_acquire)) {
    MeterPayload p{};
    if (!reader.read(p)) continue;
    if (p.playHeadSamples == 0) continue;  // pristine block, nothing published yet
    const auto expected = static_cast<double>(p.playHeadSamples);
    const auto expectedByte = static_cast<float>(p.playHeadSamples & 0xFF);
    if (p.tempoBpm != expected || p.masterPeakL != expectedByte ||
        p.trackPeak[0] != expectedByte ||
        p.trackCount != static_cast<std::uint32_t>(p.playHeadSamples & 0xFF)) {
      tornReads.fetch_add(1, std::memory_order_relaxed);
    } else {
      okReads.fetch_add(1, std::memory_order_relaxed);
    }
  }

  writerThread.join();

  std::printf("        (%d clean reads, %d torn)\n", okReads.load(), tornReads.load());
  CHECK_EQ(tornReads.load(), 0);
  CHECK(okReads.load() > 0);
}
