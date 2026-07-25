#include "TestFramework.h"
#include "musio/ClipPlayer.h"
#include "musio/CoreEngine.h"

#include <vector>

using namespace musio;

namespace {

/// A source buffer whose sample value equals its frame index / 1000, so a
/// rendered sample tells you exactly which source frame it came from.
SampleBufferPtr rampBuffer(SampleCount frames, int channels = 2) {
  auto buffer = std::make_unique<SampleBuffer>(channels, frames, 48000.0);
  for (int ch = 0; ch < channels; ++ch) {
    float* data = buffer->writableChannel(ch);
    for (SampleCount i = 0; i < frames; ++i) {
      data[i] = static_cast<float>(i) / 1000.0f + (ch == 1 ? 0.5f : 0.0f);
    }
  }
  return buffer;
}

SampleBufferPtr dcBuffer(SampleCount frames, float value, int channels = 2) {
  auto buffer = std::make_unique<SampleBuffer>(channels, frames, 48000.0);
  for (int ch = 0; ch < channels; ++ch) {
    float* data = buffer->writableChannel(ch);
    for (SampleCount i = 0; i < frames; ++i) data[i] = value;
  }
  return buffer;
}

BlockSegment seg(SampleCount start, int length) {
  BlockSegment s;
  s.startSample = start;
  s.length = length;
  return s;
}

}  // namespace

// --------------------------------------------------------------- fade curves

MUSIO_TEST(clip, fade_curves_are_bounded_and_monotonic) {
  for (const auto curve : {FadeCurve::Linear, FadeCurve::Logarithmic,
                           FadeCurve::Exponential, FadeCurve::SCurve}) {
    CHECK_NEAR(applyFadeCurve(curve, 0.0f), 0.0, 1e-6);
    CHECK_NEAR(applyFadeCurve(curve, 1.0f), 1.0, 1e-6);
    // Out-of-range input must clamp, not extrapolate.
    CHECK_NEAR(applyFadeCurve(curve, -5.0f), 0.0, 1e-6);
    CHECK_NEAR(applyFadeCurve(curve, 5.0f), 1.0, 1e-6);

    float previous = -1.0f;
    for (int i = 0; i <= 100; ++i) {
      const float v = applyFadeCurve(curve, static_cast<float>(i) / 100.0f);
      CHECK(v >= previous - 1e-6f);
      previous = v;
    }
  }
}

MUSIO_TEST(clip, fade_curve_shapes_differ_as_documented) {
  const float t = 0.5f;
  CHECK_NEAR(applyFadeCurve(FadeCurve::Linear, t), 0.5, 1e-6);
  CHECK_NEAR(applyFadeCurve(FadeCurve::Exponential, t), 0.25, 1e-6);  // slow start
  CHECK_NEAR(applyFadeCurve(FadeCurve::Logarithmic, t), 0.75, 1e-6);  // fast start
  CHECK_NEAR(applyFadeCurve(FadeCurve::SCurve, t), 0.5, 1e-6);        // symmetric

  // Smoothstep must have zero slope at the ends: that is what stops butt-joined
  // clips clicking.
  const float nearZero = applyFadeCurve(FadeCurve::SCurve, 0.01f);
  CHECK(nearZero < 0.001f);
}

MUSIO_TEST(clip, fade_curve_names_match_the_swift_enum) {
  CHECK(fadeCurveFromString("linear") == FadeCurve::Linear);
  CHECK(fadeCurveFromString("logarithmic") == FadeCurve::Logarithmic);
  CHECK(fadeCurveFromString("exponential") == FadeCurve::Exponential);
  CHECK(fadeCurveFromString("sCurve") == FadeCurve::SCurve);
  CHECK(fadeCurveFromString("something-new") == FadeCurve::Linear);  // graceful default
  CHECK_STR_EQ(fadeCurveToString(FadeCurve::SCurve), "sCurve");
}

// ------------------------------------------------------- source frame mapping

MUSIO_TEST(clip, source_frame_follows_the_timeline) {
  auto buffer = rampBuffer(10000);
  ClipRt clip;
  clip.source = buffer.get();
  clip.timelineStart = 5000;
  clip.timelineLength = 2000;
  clip.sourceOffset = 100;
  clip.sourceLength = 2000;

  CHECK_EQ(clipSourceFrameAt(clip, 4999), -1);  // before the clip
  CHECK_EQ(clipSourceFrameAt(clip, 5000), 100);
  CHECK_EQ(clipSourceFrameAt(clip, 5001), 101);
  CHECK_EQ(clipSourceFrameAt(clip, 6999), 2099);
  CHECK_EQ(clipSourceFrameAt(clip, 7000), -1);  // after the clip
}

MUSIO_TEST(clip, unlooped_clip_goes_silent_past_its_material) {
  auto buffer = rampBuffer(1000);
  ClipRt clip;
  clip.source = buffer.get();
  clip.timelineStart = 0;
  clip.timelineLength = 5000;  // longer than the audio
  clip.sourceLength = 800;
  clip.looped = false;

  CHECK_EQ(clipSourceFrameAt(clip, 799), 799);
  // Past the material: silence rather than a read beyond the buffer.
  CHECK_EQ(clipSourceFrameAt(clip, 800), -1);
  CHECK_EQ(clipSourceFrameAt(clip, 4999), -1);
}

MUSIO_TEST(clip, looped_clip_wraps_within_its_material) {
  auto buffer = rampBuffer(1000);
  ClipRt clip;
  clip.source = buffer.get();
  clip.timelineStart = 0;
  clip.timelineLength = 2500;
  clip.sourceOffset = 0;
  clip.sourceLength = 1000;
  clip.looped = true;

  CHECK_EQ(clipSourceFrameAt(clip, 0), 0);
  CHECK_EQ(clipSourceFrameAt(clip, 999), 999);
  CHECK_EQ(clipSourceFrameAt(clip, 1000), 0);     // wrapped
  CHECK_EQ(clipSourceFrameAt(clip, 1500), 500);
  CHECK_EQ(clipSourceFrameAt(clip, 2499), 499);
  CHECK_EQ(clipSourceFrameAt(clip, 2500), -1);    // clip ended
}

MUSIO_TEST(clip, source_length_is_clamped_to_available_audio) {
  auto buffer = rampBuffer(500);
  ClipRt clip;
  clip.source = buffer.get();
  clip.timelineLength = 2000;
  clip.sourceOffset = 100;
  clip.sourceLength = 9999;  // claims more than the file holds
  clip.looped = true;

  // Only 400 frames are actually available from offset 100.
  CHECK_EQ(clipSourceFrameAt(clip, 0), 100);
  CHECK_EQ(clipSourceFrameAt(clip, 399), 499);
  CHECK_EQ(clipSourceFrameAt(clip, 400), 100);  // wraps at the real limit
}

// ------------------------------------------------------------------ envelope

MUSIO_TEST(clip, fades_shape_the_envelope) {
  auto buffer = dcBuffer(10000, 1.0f);
  ClipRt clip;
  clip.source = buffer.get();
  clip.timelineStart = 0;
  clip.timelineLength = 1000;
  clip.sourceLength = 1000;
  clip.fadeInFrames = 100;
  clip.fadeOutFrames = 200;
  clip.fadeInCurve = FadeCurve::Linear;
  clip.fadeOutCurve = FadeCurve::Linear;

  CHECK_NEAR(clipEnvelopeAt(clip, 0), 0.0, 1e-6);
  CHECK_NEAR(clipEnvelopeAt(clip, 50), 0.5, 1e-6);
  CHECK_NEAR(clipEnvelopeAt(clip, 100), 1.0, 1e-6);
  CHECK_NEAR(clipEnvelopeAt(clip, 500), 1.0, 1e-6);  // plateau
  CHECK_NEAR(clipEnvelopeAt(clip, 800), 1.0, 1e-6);  // fade-out begins here
  CHECK_NEAR(clipEnvelopeAt(clip, 900), 0.5, 1e-6);
  CHECK_NEAR(clipEnvelopeAt(clip, 999), 0.005, 1e-3);
  CHECK_NEAR(clipEnvelopeAt(clip, 1000), 0.0, 1e-6);  // outside
}

MUSIO_TEST(clip, gain_and_mute_apply_to_the_envelope) {
  auto buffer = dcBuffer(1000, 1.0f);
  ClipRt clip;
  clip.source = buffer.get();
  clip.timelineLength = 1000;
  clip.sourceLength = 1000;
  clip.gain = 0.25f;

  CHECK_NEAR(clipEnvelopeAt(clip, 500), 0.25, 1e-6);

  clip.muted = true;
  CHECK_NEAR(clipEnvelopeAt(clip, 500), 0.0, 1e-6);
}

MUSIO_TEST(clip, overlapping_fades_multiply) {
  auto buffer = dcBuffer(1000, 1.0f);
  ClipRt clip;
  clip.source = buffer.get();
  clip.timelineLength = 100;
  clip.sourceLength = 100;
  // Fades longer than half the clip, so they overlap in the middle.
  clip.fadeInFrames = 80;
  clip.fadeOutFrames = 80;

  // At the midpoint: fade-in is 50/80, fade-out is 1 - 30/80.
  const float expected = (50.0f / 80.0f) * (1.0f - 30.0f / 80.0f);
  CHECK_NEAR(clipEnvelopeAt(clip, 50), expected, 1e-5);
  // Never exceeds unity even where they overlap.
  for (SampleCount i = 0; i < 100; ++i) CHECK(clipEnvelopeAt(clip, i) <= 1.0f);
}

// ----------------------------------------------------------------- rendering

MUSIO_TEST(clip, scene_builder_sorts_by_timeline_start) {
  ClipSceneBuilder builder;
  const SampleBuffer* buffer = builder.adopt(dcBuffer(100, 1.0f));
  CHECK(buffer != nullptr);

  for (const SampleCount start : {5000, 1000, 9000, 3000}) {
    ClipRt clip;
    clip.source = buffer;
    clip.timelineStart = start;
    clip.timelineLength = 100;
    clip.sourceLength = 100;
    builder.addClip(clip);
  }

  const auto scene = builder.finish();
  CHECK_EQ(static_cast<int>(scene->clips().size()), 4);
  CHECK_EQ(scene->clips()[0].timelineStart, 1000);
  CHECK_EQ(scene->clips()[1].timelineStart, 3000);
  CHECK_EQ(scene->clips()[2].timelineStart, 5000);
  CHECK_EQ(scene->clips()[3].timelineStart, 9000);
}

MUSIO_TEST(clip, scene_builder_rejects_degenerate_clips) {
  ClipSceneBuilder builder;
  const SampleBuffer* buffer = builder.adopt(dcBuffer(100, 1.0f));

  ClipRt noSource;
  noSource.timelineLength = 100;
  builder.addClip(noSource);  // no audio

  ClipRt noLength;
  noLength.source = buffer;
  noLength.timelineLength = 0;
  builder.addClip(noLength);  // zero length

  CHECK_EQ(static_cast<int>(builder.finish()->clips().size()), 0);
}

MUSIO_TEST(clip, scene_builder_enforces_the_preload_budget) {
  // 4 KiB budget: a 2-channel 1000-frame float buffer is 8000 bytes.
  ClipSceneBuilder builder(4096);
  CHECK(builder.adopt(dcBuffer(1000, 1.0f)) == nullptr);
  CHECK(builder.budgetExceeded());

  // A small buffer still fits.
  ClipSceneBuilder ok(16384);
  CHECK(ok.adopt(dcBuffer(1000, 1.0f)) != nullptr);
  CHECK(!ok.budgetExceeded());
  CHECK_EQ(static_cast<int>(ok.audioBytes()), 8000);
}

MUSIO_TEST(clip, renders_the_expected_source_samples) {
  ClipSceneBuilder builder;
  const SampleBuffer* buffer = builder.adopt(rampBuffer(10000));

  ClipRt clip;
  clip.source = buffer;
  clip.slot = 0;
  clip.timelineStart = 1000;
  clip.timelineLength = 500;
  clip.sourceOffset = 200;
  clip.sourceLength = 500;
  builder.addClip(clip);

  const auto scene = builder.finish();

  std::vector<float> left(2048, 0.0f);
  std::vector<float> right(2048, 0.0f);

  // One block covering the whole clip.
  renderClipsForTrack(*scene, 0, seg(900, 2048), left.data(), right.data(), 0);

  // Before the clip: silence.
  CHECK_NEAR(left[0], 0.0, 1e-6);
  CHECK_NEAR(left[99], 0.0, 1e-6);
  // Clip starts at timeline 1000 = index 100 in this block, reading source 200.
  CHECK_NEAR(left[100], 200.0 / 1000.0, 1e-5);
  CHECK_NEAR(left[101], 201.0 / 1000.0, 1e-5);
  CHECK_NEAR(left[599], 699.0 / 1000.0, 1e-5);
  // After the clip: silence again.
  CHECK_NEAR(left[600], 0.0, 1e-6);

  // Right channel of the ramp buffer is offset by 0.5.
  CHECK_NEAR(right[100], 200.0 / 1000.0 + 0.5, 1e-5);
}

MUSIO_TEST(clip, mono_source_feeds_both_channels) {
  ClipSceneBuilder builder;
  const SampleBuffer* buffer = builder.adopt(dcBuffer(1000, 0.75f, /*channels=*/1));

  ClipRt clip;
  clip.source = buffer;
  clip.slot = 0;
  clip.timelineLength = 1000;
  clip.sourceLength = 1000;
  builder.addClip(clip);

  const auto scene = builder.finish();
  std::vector<float> left(512, 0.0f);
  std::vector<float> right(512, 0.0f);
  renderClipsForTrack(*scene, 0, seg(0, 512), left.data(), right.data(), 0);

  CHECK_NEAR(left[10], 0.75, 1e-6);
  CHECK_NEAR(right[10], 0.75, 1e-6);
}

MUSIO_TEST(clip, only_the_addressed_track_is_rendered) {
  ClipSceneBuilder builder;
  const SampleBuffer* buffer = builder.adopt(dcBuffer(1000, 1.0f));

  for (const TrackSlot slot : {0u, 1u}) {
    ClipRt clip;
    clip.source = buffer;
    clip.slot = slot;
    clip.timelineLength = 1000;
    clip.sourceLength = 1000;
    clip.gain = slot == 0 ? 0.25f : 0.75f;
    builder.addClip(clip);
  }

  const auto scene = builder.finish();
  std::vector<float> left(512, 0.0f);
  std::vector<float> right(512, 0.0f);

  renderClipsForTrack(*scene, 0, seg(0, 512), left.data(), right.data(), 0);
  CHECK_NEAR(left[10], 0.25, 1e-6);

  std::fill(left.begin(), left.end(), 0.0f);
  renderClipsForTrack(*scene, 1, seg(0, 512), left.data(), right.data(), 0);
  CHECK_NEAR(left[10], 0.75, 1e-6);
}

MUSIO_TEST(clip, overlapping_clips_on_one_track_sum) {
  ClipSceneBuilder builder;
  const SampleBuffer* buffer = builder.adopt(dcBuffer(1000, 0.5f));

  for (const SampleCount start : {0, 100}) {
    ClipRt clip;
    clip.source = buffer;
    clip.slot = 0;
    clip.timelineStart = start;
    clip.timelineLength = 500;
    clip.sourceLength = 500;
    builder.addClip(clip);
  }

  const auto scene = builder.finish();
  std::vector<float> left(1024, 0.0f);
  std::vector<float> right(1024, 0.0f);
  renderClipsForTrack(*scene, 0, seg(0, 1024), left.data(), right.data(), 0);

  CHECK_NEAR(left[50], 0.5, 1e-6);   // clip A only
  CHECK_NEAR(left[200], 1.0, 1e-6);  // both
  CHECK_NEAR(left[550], 0.5, 1e-6);  // clip B only
  CHECK_NEAR(left[700], 0.0, 1e-6);  // neither
}

MUSIO_TEST(clip, render_accumulates_rather_than_overwrites) {
  ClipSceneBuilder builder;
  const SampleBuffer* buffer = builder.adopt(dcBuffer(1000, 0.25f));

  ClipRt clip;
  clip.source = buffer;
  clip.slot = 0;
  clip.timelineLength = 1000;
  clip.sourceLength = 1000;
  builder.addClip(clip);

  const auto scene = builder.finish();
  std::vector<float> left(512, 0.5f);  // pre-existing content
  std::vector<float> right(512, 0.5f);
  renderClipsForTrack(*scene, 0, seg(0, 512), left.data(), right.data(), 0);

  // The clip must be added to what was already on the bus, so a track can carry
  // clips and an instrument at once.
  CHECK_NEAR(left[10], 0.75, 1e-6);
}

MUSIO_TEST(clip, write_offset_is_honoured) {
  ClipSceneBuilder builder;
  const SampleBuffer* buffer = builder.adopt(dcBuffer(1000, 1.0f));

  ClipRt clip;
  clip.source = buffer;
  clip.slot = 0;
  clip.timelineLength = 1000;
  clip.sourceLength = 1000;
  builder.addClip(clip);

  const auto scene = builder.finish();
  std::vector<float> left(512, 0.0f);
  std::vector<float> right(512, 0.0f);

  // Render a 100-sample segment into the middle of the block, as the segmented
  // transport loop does after a loop wrap.
  renderClipsForTrack(*scene, 0, seg(0, 100), left.data(), right.data(), 200);

  CHECK_NEAR(left[199], 0.0, 1e-6);
  CHECK_NEAR(left[200], 1.0, 1e-6);
  CHECK_NEAR(left[299], 1.0, 1e-6);
  CHECK_NEAR(left[300], 0.0, 1e-6);
}

// The same invariance property the transport and metronome have: what comes out
// must not depend on the device buffer size.
MUSIO_TEST(clip, rendered_clip_audio_is_buffer_size_invariant) {
  constexpr int kTotal = 20000;
  std::vector<std::vector<float>> renders;

  for (const int blockSize : {37, 64, 256, 512, 1024}) {
    ClipSceneBuilder builder;
    const SampleBuffer* buffer = builder.adopt(rampBuffer(8000));

    ClipRt clip;
    clip.source = buffer;
    clip.slot = 0;
    clip.timelineStart = 3331;  // deliberately not a multiple of any block size
    clip.timelineLength = 12000;
    clip.sourceOffset = 17;
    clip.sourceLength = 5000;
    clip.looped = true;
    clip.fadeInFrames = 641;
    clip.fadeOutFrames = 977;
    clip.fadeInCurve = FadeCurve::SCurve;
    clip.fadeOutCurve = FadeCurve::Exponential;
    builder.addClip(clip);

    const auto scene = builder.finish();

    std::vector<float> full;
    full.reserve(kTotal);
    std::vector<float> left(static_cast<std::size_t>(blockSize), 0.0f);
    std::vector<float> right(static_cast<std::size_t>(blockSize), 0.0f);

    int produced = 0;
    while (produced < kTotal) {
      const int n = std::min(blockSize, kTotal - produced);
      std::fill(left.begin(), left.end(), 0.0f);
      std::fill(right.begin(), right.end(), 0.0f);
      renderClipsForTrack(*scene, 0, seg(produced, n), left.data(), right.data(), 0);
      for (int i = 0; i < n; ++i) full.push_back(left[static_cast<std::size_t>(i)]);
      produced += n;
    }
    renders.push_back(std::move(full));
  }

  for (std::size_t r = 1; r < renders.size(); ++r) {
    CHECK_EQ(renders[r].size(), renders[0].size());
    for (std::size_t i = 0; i < renders[0].size(); ++i) {
      if (std::fabs(renders[r][i] - renders[0][i]) > 1e-6f) {
        ::musio::test::fail(MUSIO_AT, "clip render diverged at sample " +
                                          std::to_string(i) + ": " +
                                          std::to_string(renders[r][i]) + " vs " +
                                          std::to_string(renders[0][i]));
      }
    }
  }
}

// -------------------------------------------------- CoreEngine integration

MUSIO_TEST(clip, engine_plays_a_published_scene) {
  CoreEngine engine;
  engine.prepare(48000.0, 512);

  ClipSceneBuilder builder;
  const SampleBuffer* buffer = builder.adopt(dcBuffer(48000, 0.5f));

  ClipRt clip;
  clip.source = buffer;
  clip.slot = 0;
  clip.timelineStart = 200;
  clip.timelineLength = 10000;
  clip.sourceLength = 10000;
  builder.addClip(clip);

  engine.publishClipScene(builder.finish());
  CHECK(engine.currentClipScene() != nullptr);

  engine.postTrackActive(0, true);
  engine.postTrackGain(0, 1.0f);
  engine.postTrackPan(0, -1.0f);  // hard left, so gain maths is exact
  engine.postMasterGain(1.0f);
  engine.postPlay();

  std::vector<float> left(512, 0.0f);
  std::vector<float> right(512, 0.0f);
  float* channels[2] = {left.data(), right.data()};

  engine.process(channels, 2, 512);

  // Silence until timeline 200, then the clip's 0.5 DC.
  CHECK_NEAR(left[0], 0.0, 1e-6);
  CHECK_NEAR(left[199], 0.0, 1e-6);
  CHECK_NEAR(left[200], 0.5, 1e-4);
  CHECK_NEAR(left[511], 0.5, 1e-4);
  // Hard left: nothing on the right.
  CHECK_NEAR(right[300], 0.0, 1e-4);
}

MUSIO_TEST(clip, engine_scene_swap_keeps_the_old_scene_alive) {
  CoreEngine engine;
  engine.prepare(48000.0, 256);

  std::vector<float> left(256, 0.0f);
  std::vector<float> right(256, 0.0f);
  float* channels[2] = {left.data(), right.data()};

  engine.postTrackActive(0, true);
  engine.postTrackGain(0, 1.0f);
  engine.postTrackPan(0, -1.0f);
  engine.postPlay();

  // Publish, render, republish, render -- repeatedly. A use-after-free in the
  // retirement logic shows up here under ASan, and a wrong scene shows up in the
  // amplitude.
  for (int generation = 1; generation <= 12; ++generation) {
    ClipSceneBuilder builder;
    const float level = static_cast<float>(generation) / 100.0f;
    const SampleBuffer* buffer = builder.adopt(dcBuffer(4096, level));

    ClipRt clip;
    clip.source = buffer;
    clip.slot = 0;
    clip.timelineLength = 1000000;
    clip.sourceLength = 4096;
    clip.looped = true;
    builder.addClip(clip);

    engine.publishClipScene(builder.finish());

    engine.process(channels, 2, 256);
    engine.process(channels, 2, 256);

    CHECK_NEAR(left[10], level, 1e-4);
  }

  engine.collectRetiredScene();
}

MUSIO_TEST(clip, engine_with_no_scene_is_silent_not_crashing) {
  CoreEngine engine;
  engine.prepare(48000.0, 512);
  CHECK(engine.currentClipScene() == nullptr);

  engine.postTrackActive(0, true);
  engine.postTrackGain(0, 1.0f);
  engine.postPlay();

  std::vector<float> left(512, 0.0f);
  std::vector<float> right(512, 0.0f);
  float* channels[2] = {left.data(), right.data()};
  engine.process(channels, 2, 512);

  for (const float v : left) CHECK_NEAR(v, 0.0, 1e-9);
}
