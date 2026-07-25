#include "TestFramework.h"
#include "musio/Metronome.h"
#include "musio/Transport.h"

#include <vector>

using namespace musio;

namespace {

/// Absolute timeline sample positions of every click over `totalSamples`,
/// rendered with the given block size.
std::vector<SampleCount> clickPositions(double bpm, int beatsPerBar, int blockSize,
                                        int totalSamples, double sampleRate = 48000.0) {
  Transport t;
  t.prepare(sampleRate);
  t.setTempo(bpm);
  t.setTimeSignature(beatsPerBar, 4);
  t.play();

  std::vector<SampleCount> positions;
  const double spb = t.tempo().samplesPerBeat(sampleRate);

  int produced = 0;
  while (produced < totalSamples) {
    const int want = std::min(blockSize, totalSamples - produced);
    int done = 0;
    while (done < want) {
      const BlockSegment seg = t.nextSegment(want - done);
      if (seg.length <= 0) break;

      ClickEvent clicks[64];
      const int n = findClicksInRange(seg.startSample, seg.length, spb, beatsPerBar,
                                      clicks, 64);
      for (int i = 0; i < n; ++i) {
        positions.push_back(seg.startSample + clicks[i].offsetInBlock);
      }

      t.advance(seg.length);
      done += seg.length;
    }
    produced += want;
  }
  return positions;
}

}  // namespace

MUSIO_TEST(metronome, click_grid_matches_tempo) {
  // 120 bpm at 48 kHz -> one beat every 24000 samples.
  const auto positions = clickPositions(120.0, 4, 512, 48000 * 2);
  CHECK_EQ(static_cast<int>(positions.size()), 4);  // 2 seconds = 4 beats
  CHECK_EQ(positions[0], 0);
  CHECK_EQ(positions[1], 24000);
  CHECK_EQ(positions[2], 48000);
  CHECK_EQ(positions[3], 72000);
}

// The click grid must be anchored to the timeline, not to the buffer. If it were
// computed per block, changing the buffer size would move the clicks.
MUSIO_TEST(metronome, click_positions_are_buffer_size_invariant) {
  std::vector<std::vector<SampleCount>> runs;
  for (const int blockSize : {31, 64, 127, 256, 512, 1000, 2048}) {
    runs.push_back(clickPositions(137.5, 4, blockSize, 48000 * 4));
  }
  for (std::size_t i = 1; i < runs.size(); ++i) {
    CHECK_EQ(runs[i].size(), runs[0].size());
    for (std::size_t k = 0; k < runs[0].size(); ++k) {
      if (runs[i][k] != runs[0][k]) {
        ::musio::test::fail(MUSIO_AT, "click " + std::to_string(k) + " moved: " +
                                          std::to_string(runs[i][k]) + " vs " +
                                          std::to_string(runs[0][k]));
      }
    }
  }
}

MUSIO_TEST(metronome, no_click_is_dropped_at_a_block_boundary) {
  // 200 bpm at 44100 Hz -> 13230 samples per beat, which lands mid-block for
  // almost any buffer size.
  const auto positions = clickPositions(200.0, 4, 480, 44100 * 3, 44100.0);
  // 3 s at 200 bpm is exactly 10 beats, at indices 0..9. The beat at index 10
  // lands on sample 132300, which is the exclusive end of the range, so it
  // belongs to the next render pass -- counting it here would double-trigger it.
  CHECK_EQ(static_cast<int>(positions.size()), 10);
  CHECK_EQ(positions.front(), 0);
  CHECK_EQ(positions.back(), 9 * 13230);
  for (std::size_t i = 1; i < positions.size(); ++i) {
    CHECK_EQ(positions[i] - positions[i - 1], 13230);
  }
}

MUSIO_TEST(metronome, accent_falls_on_beat_one) {
  ClickEvent clicks[64];
  const double spb = 24000.0;  // 120 bpm @ 48k
  const int n = findClicksInRange(0, 48000 * 3, spb, 4, clicks, 64);
  CHECK_EQ(n, 6);  // 3 seconds = 6 beats at 120 bpm
  CHECK(clicks[0].accent);
  CHECK(!clicks[1].accent);
  CHECK(!clicks[2].accent);
  CHECK(!clicks[3].accent);
  CHECK(clicks[4].accent);  // bar 2, beat 1
  CHECK(!clicks[5].accent);
}

MUSIO_TEST(metronome, accent_follows_time_signature) {
  ClickEvent clicks[64];
  const double spb = 24000.0;
  const int n = findClicksInRange(0, 24000 * 7, spb, 3, clicks, 64);  // 3/4
  CHECK_EQ(n, 7);
  CHECK(clicks[0].accent);
  CHECK(clicks[3].accent);
  CHECK(clicks[6].accent);
  CHECK(!clicks[1].accent);
  CHECK(!clicks[4].accent);
}

MUSIO_TEST(metronome, empty_range_yields_nothing) {
  ClickEvent clicks[8];
  CHECK_EQ(findClicksInRange(0, 0, 24000.0, 4, clicks, 8), 0);
  CHECK_EQ(findClicksInRange(0, 512, 0.0, 4, clicks, 8), 0);
  CHECK_EQ(findClicksInRange(0, 512, 24000.0, 4, nullptr, 8), 0);
}

MUSIO_TEST(metronome, voice_renders_audio_and_decays) {
  Metronome m;
  m.prepare(48000.0);
  m.setEnabled(true);
  m.setGain(1.0f);

  std::vector<float> left(4096, 0.0f);
  std::vector<float> right(4096, 0.0f);

  CHECK(!m.isRinging());
  m.trigger(true);
  CHECK(m.isRinging());

  m.renderInto(left.data(), right.data(), 0, 4096);

  float peak = 0.0f;
  for (const float v : left) peak = std::max(peak, std::fabs(v));
  CHECK(peak > 0.05f);  // audible

  // A 30 ms click at 48 kHz is 1440 samples, so it must be silent well before
  // the end of a 4096-sample buffer.
  CHECK(!m.isRinging());
  for (std::size_t i = 2048; i < left.size(); ++i) {
    CHECK_NEAR(left[i], 0.0, 1e-6);
  }
}

MUSIO_TEST(metronome, disabled_metronome_is_silent) {
  Metronome m;
  m.prepare(48000.0);
  m.setEnabled(false);
  CHECK(!m.isEnabled());
  std::vector<float> buf(512, 0.0f);
  m.renderInto(buf.data(), nullptr, 0, 512);
  for (const float v : buf) CHECK_NEAR(v, 0.0, 1e-9);
}
