#include "TestFramework.h"
#include "musio/Transport.h"

#include <vector>

using namespace musio;

namespace {

/// Walk the transport for `totalSamples` using a fixed block size, recording
/// every timeline position actually visited.
std::vector<SampleCount> walk(Transport& t, int blockSize, int totalSamples) {
  std::vector<SampleCount> visited;
  visited.reserve(static_cast<std::size_t>(totalSamples));

  int produced = 0;
  while (produced < totalSamples) {
    const int want = std::min(blockSize, totalSamples - produced);
    int done = 0;
    while (done < want) {
      const BlockSegment seg = t.nextSegment(want - done);
      if (seg.length <= 0) break;
      for (int i = 0; i < seg.length; ++i) visited.push_back(seg.startSample + i);
      t.advance(seg.length);
      done += seg.length;
    }
    produced += want;
  }
  return visited;
}

}  // namespace

MUSIO_TEST(transport, starts_stopped_at_zero) {
  Transport t;
  t.prepare(48000.0);
  CHECK(!t.isPlaying());
  CHECK_EQ(t.position(), 0);
}

MUSIO_TEST(transport, advance_only_moves_while_playing) {
  Transport t;
  t.prepare(48000.0);
  t.advance(512);
  CHECK_EQ(t.position(), 0);
  t.play();
  t.advance(512);
  CHECK_EQ(t.position(), 512);
  t.pause();
  t.advance(512);
  CHECK_EQ(t.position(), 512);
}

MUSIO_TEST(transport, stop_returns_to_loop_start) {
  Transport t;
  t.prepare(48000.0);
  t.setLoop(true, 1000, 3000);
  t.play();
  t.advance(1500);
  t.stop();
  CHECK(!t.isPlaying());
  CHECK_EQ(t.position(), 1000);
}

MUSIO_TEST(transport, segment_is_clipped_at_loop_end) {
  Transport t;
  t.prepare(48000.0);
  t.setLoop(true, 1000, 3000);
  t.seek(2924);
  t.play();

  const BlockSegment seg = t.nextSegment(512);
  // 3000 - 2924 = 76 samples remain before the loop point.
  CHECK_EQ(seg.length, 76);
  CHECK(seg.wrapsAtEnd);
  CHECK_EQ(seg.startSample, 2924);

  t.advance(seg.length);
  CHECK_EQ(t.position(), 1000);  // wrapped exactly, no overshoot

  const BlockSegment next = t.nextSegment(512 - 76);
  CHECK_EQ(next.length, 436);
  CHECK(!next.wrapsAtEnd);
}

MUSIO_TEST(transport, head_before_loop_start_runs_freely) {
  Transport t;
  t.prepare(48000.0);
  t.setLoop(true, 1000, 3000);
  t.seek(900);
  t.play();
  // Not inside the loop yet, so the block must not be clipped.
  const BlockSegment seg = t.nextSegment(512);
  CHECK_EQ(seg.length, 512);
  CHECK(!seg.wrapsAtEnd);
}

MUSIO_TEST(transport, no_samples_lost_or_duplicated) {
  Transport t;
  t.prepare(48000.0);
  t.setLoop(true, 1000, 3000);
  t.seek(1000);
  t.play();

  const auto visited = walk(t, 512, 48000);
  // Every requested sample must be accounted for exactly once.
  CHECK_EQ(static_cast<int>(visited.size()), 48000);
  // And every position must lie inside the loop region.
  for (const auto pos : visited) {
    CHECK(pos >= 1000);
    CHECK(pos < 3000);
  }
}

// This is the test that would have caught a block-quantised loop. A transport
// that jumps at buffer boundaries produces a different position sequence for
// each buffer size; a sample-accurate one produces the same sequence for all.
MUSIO_TEST(transport, position_sequence_is_buffer_size_invariant) {
  const int kTotal = 24000;
  std::vector<std::vector<SampleCount>> runs;

  for (const int blockSize : {32, 64, 128, 256, 512, 1024, 4096}) {
    Transport t;
    t.prepare(48000.0);
    t.setTempo(120.0);
    t.setLoop(true, 7331, 21023);  // deliberately not a multiple of any block size
    t.seek(7331);
    t.play();
    runs.push_back(walk(t, blockSize, kTotal));
  }

  for (std::size_t i = 1; i < runs.size(); ++i) {
    CHECK_EQ(runs[i].size(), runs[0].size());
    for (std::size_t s = 0; s < runs[0].size(); ++s) {
      if (runs[i][s] != runs[0][s]) {
        ::musio::test::fail(MUSIO_AT, "loop position diverged at sample " +
                                          std::to_string(s) + ": " +
                                          std::to_string(runs[i][s]) + " vs " +
                                          std::to_string(runs[0][s]));
      }
    }
  }
}

MUSIO_TEST(transport, loop_wrap_count_matches_arithmetic) {
  Transport t;
  t.prepare(48000.0);
  const SampleCount start = 1000;
  const SampleCount end = 1500;  // 500-sample loop
  t.setLoop(true, start, end);
  t.seek(start);
  t.play();

  int wraps = 0;
  int produced = 0;
  while (produced < 5000) {
    const BlockSegment seg = t.nextSegment(128);
    if (seg.length <= 0) break;
    if (seg.wrapsAtEnd) ++wraps;
    t.advance(seg.length);
    produced += seg.length;
  }
  // 5000 samples through a 500-sample loop = 10 wraps.
  CHECK_EQ(wraps, 10);
}

MUSIO_TEST(transport, disabled_loop_runs_past_the_region) {
  Transport t;
  t.prepare(48000.0);
  t.setLoop(false, 1000, 2000);
  t.seek(1900);
  t.play();
  const BlockSegment seg = t.nextSegment(512);
  CHECK_EQ(seg.length, 512);
  t.advance(seg.length);
  CHECK_EQ(t.position(), 2412);
}

MUSIO_TEST(transport, degenerate_loop_is_ignored) {
  Transport t;
  t.prepare(48000.0);
  t.setLoop(true, 5000, 5000);  // zero length
  t.seek(4900);
  t.play();
  const BlockSegment seg = t.nextSegment(256);
  CHECK_EQ(seg.length, 256);
  t.advance(seg.length);
  CHECK_EQ(t.position(), 5156);  // must not deadlock or snap back
}

MUSIO_TEST(transport, beats_track_tempo) {
  Transport t;
  t.prepare(48000.0);
  t.setTempo(120.0);  // 2 beats per second -> 24000 samples per beat
  t.seek(24000);
  CHECK_NEAR(t.positionInBeats(), 1.0, 1e-9);
  t.setTempo(60.0);  // 48000 samples per beat
  CHECK_NEAR(t.positionInBeats(), 0.5, 1e-9);
}
