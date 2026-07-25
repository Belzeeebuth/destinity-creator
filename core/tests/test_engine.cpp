#include "TestFramework.h"
#include "musio/CoreEngine.h"
#include "musio/Persistence.h"

#include <cstdio>
#include <vector>

using namespace musio;

namespace {

struct StereoBuffer {
  std::vector<float> left;
  std::vector<float> right;
  float* ptrs[2];

  explicit StereoBuffer(int n) : left(static_cast<std::size_t>(n), 0.0f),
                                 right(static_cast<std::size_t>(n), 0.0f) {
    ptrs[0] = left.data();
    ptrs[1] = right.data();
  }
};

float peakOf(const std::vector<float>& v) {
  float p = 0.0f;
  for (const float s : v) p = std::max(p, std::fabs(s));
  return p;
}

/// A test instrument: emits a constant DC level while any note is held. DC makes
/// gain, pan and mute arithmetic trivially checkable.
class DcInstrument final : public IPluginInstance {
 public:
  void prepare(double, int) override {}
  void release() override {}
  void reset() override { held_ = 0; }

  void process(float* const* channels, int numChannels, int numSamples,
               const ScheduledMidiEvent* midi, int numMidiEvents,
               SampleCount blockStart) override {
    int cursor = 0;
    for (int e = 0; e < numMidiEvents; ++e) {
      const auto& ev = midi[e];
      if (ev.slot != slot_) continue;
      const int offset = clamp(static_cast<int>(ev.samplePosition - blockStart), 0, numSamples);
      fill(channels, numChannels, cursor, offset);
      cursor = offset;
      const std::uint8_t kind = ev.status & 0xF0;
      if (kind == 0x90 && ev.data2 > 0) {
        ++held_;
      } else if (kind == 0x80 || (kind == 0x90 && ev.data2 == 0)) {
        if (held_ > 0) --held_;
      }
    }
    fill(channels, numChannels, cursor, numSamples);
  }

  int numParameters() const override { return 0; }
  float parameter(int) const override { return 0.0f; }
  void setParameter(int, float) override {}
  bool isBypassed() const override { return false; }
  void setBypassed(bool) override {}

  void setSlot(TrackSlot s) { slot_ = s; }
  int held() const { return held_; }

 private:
  void fill(float* const* channels, int numChannels, int from, int to) {
    if (to <= from) return;
    const float v = held_ > 0 ? 1.0f : 0.0f;
    for (int ch = 0; ch < numChannels; ++ch) {
      if (channels[ch] == nullptr) continue;
      for (int i = from; i < to; ++i) channels[ch][i] = v;
    }
  }

  TrackSlot slot_ = 0;
  int held_ = 0;
};

/// Run the engine until every queued command has been consumed.
void settle(CoreEngine& engine, StereoBuffer& buf, int blockSize, int blocks = 4) {
  for (int i = 0; i < blocks; ++i) engine.process(buf.ptrs, 2, blockSize);
}

}  // namespace

MUSIO_TEST(engine, process_before_prepare_is_safe) {
  CoreEngine engine;
  StereoBuffer buf(512);
  engine.process(buf.ptrs, 2, 512);  // must not crash
  CHECK_NEAR(peakOf(buf.left), 0.0, 1e-9);
}

MUSIO_TEST(engine, output_is_silent_with_no_tracks) {
  CoreEngine engine;
  engine.prepare(48000.0, 512);
  StereoBuffer buf(512);
  engine.postPlay();
  settle(engine, buf, 512);
  CHECK_NEAR(peakOf(buf.left), 0.0, 1e-9);
  CHECK_NEAR(peakOf(buf.right), 0.0, 1e-9);
}

MUSIO_TEST(engine, oversized_block_is_refused_not_allocated) {
  CoreEngine engine;
  engine.prepare(48000.0, 256);
  StereoBuffer buf(1024);
  for (float& v : buf.left) v = 0.5f;
  engine.process(buf.ptrs, 2, 1024);  // larger than prepared -> silence, no crash
  CHECK_NEAR(peakOf(buf.left), 0.0, 1e-9);
}

MUSIO_TEST(engine, commands_are_applied_on_the_audio_thread) {
  CoreEngine engine;
  engine.prepare(48000.0, 512);
  StereoBuffer buf(512);

  engine.postTempo(140.0);
  engine.postTimeSignature(3, 4);
  // Not visible until the audio thread drains the queue.
  CHECK_NEAR(engine.transport().tempo().bpm, 120.0, 1e-9);

  engine.process(buf.ptrs, 2, 512);
  CHECK_NEAR(engine.transport().tempo().bpm, 140.0, 1e-9);
  CHECK_EQ(engine.transport().timeSignature().numerator, 3);
}

MUSIO_TEST(engine, transport_position_advances_by_block_size) {
  CoreEngine engine;
  engine.prepare(48000.0, 512);
  StereoBuffer buf(512);

  engine.postPlay();
  engine.process(buf.ptrs, 2, 512);
  CHECK_EQ(engine.transport().position(), 512);

  for (int i = 0; i < 9; ++i) engine.process(buf.ptrs, 2, 512);
  CHECK_EQ(engine.transport().position(), 5120);

  engine.postStop();
  engine.process(buf.ptrs, 2, 512);
  CHECK_EQ(engine.transport().position(), 0);
  CHECK(!engine.transport().isPlaying());
}

MUSIO_TEST(engine, metronome_produces_audio_when_enabled) {
  CoreEngine engine;
  engine.prepare(48000.0, 512);
  StereoBuffer buf(512);

  engine.postMetronome(true);
  engine.postMetronomeGain(1.0f);
  engine.postPlay();

  float overallPeak = 0.0f;
  for (int i = 0; i < 100; ++i) {  // 51200 samples > one beat at 120 bpm
    engine.process(buf.ptrs, 2, 512);
    overallPeak = std::max(overallPeak, peakOf(buf.left));
  }
  CHECK(overallPeak > 0.05f);
}

MUSIO_TEST(engine, metronome_is_silent_when_disabled) {
  CoreEngine engine;
  engine.prepare(48000.0, 512);
  StereoBuffer buf(512);

  engine.postMetronome(false);
  engine.postPlay();

  float overallPeak = 0.0f;
  for (int i = 0; i < 100; ++i) {
    engine.process(buf.ptrs, 2, 512);
    overallPeak = std::max(overallPeak, peakOf(buf.left));
  }
  CHECK_NEAR(overallPeak, 0.0, 1e-9);
}

MUSIO_TEST(engine, instrument_gain_and_pan_are_applied) {
  CoreEngine engine;
  engine.prepare(48000.0, 512);
  StereoBuffer buf(512);

  DcInstrument instrument;
  instrument.setSlot(0);
  engine.setTrackInstrument(0, &instrument);

  engine.postTrackActive(0, true);
  engine.postTrackGain(0, 1.0f);
  engine.postTrackPan(0, 0.0f);
  engine.postMasterGain(1.0f);
  engine.postClearScheduledMidi();
  engine.postScheduledMidi(ScheduledMidiEvent::noteOn(0, 0, 60, 100));
  engine.postPlay();

  engine.process(buf.ptrs, 2, 512);

  // Centre pan is equal-power: cos(pi/4) == sin(pi/4) == 0.7071.
  CHECK_NEAR(peakOf(buf.left), 0.70710678, 1e-4);
  CHECK_NEAR(peakOf(buf.right), 0.70710678, 1e-4);

  // Hard left: right channel must be silent.
  engine.postTrackPan(0, -1.0f);
  engine.process(buf.ptrs, 2, 512);
  CHECK_NEAR(peakOf(buf.left), 1.0, 1e-4);
  CHECK_NEAR(peakOf(buf.right), 0.0, 1e-4);

  // Half gain, centre.
  engine.postTrackPan(0, 0.0f);
  engine.postTrackGain(0, 0.5f);
  engine.process(buf.ptrs, 2, 512);
  CHECK_NEAR(peakOf(buf.left), 0.35355339, 1e-4);
}

MUSIO_TEST(engine, mute_and_solo_gate_the_mix) {
  CoreEngine engine;
  engine.prepare(48000.0, 512);
  StereoBuffer buf(512);

  DcInstrument a;
  DcInstrument b;
  a.setSlot(0);
  b.setSlot(1);
  engine.setTrackInstrument(0, &a);
  engine.setTrackInstrument(1, &b);

  for (TrackSlot s : {0u, 1u}) {
    engine.postTrackActive(s, true);
    engine.postTrackGain(s, 1.0f);
    engine.postTrackPan(s, 0.0f);
  }
  engine.postClearScheduledMidi();
  engine.postScheduledMidi(ScheduledMidiEvent::noteOn(0, 0, 60, 100));
  engine.postScheduledMidi(ScheduledMidiEvent::noteOn(1, 0, 64, 100));
  engine.postPlay();
  engine.process(buf.ptrs, 2, 512);

  // Two DC tracks summing at centre pan.
  const float both = peakOf(buf.left);
  CHECK_NEAR(both, 2.0 * 0.70710678, 1e-4);

  engine.postTrackMute(0, true);
  engine.process(buf.ptrs, 2, 512);
  CHECK_NEAR(peakOf(buf.left), 0.70710678, 1e-4);

  // Solo on the muted track: mute still wins.
  engine.postTrackSolo(0, true);
  engine.process(buf.ptrs, 2, 512);
  CHECK_NEAR(peakOf(buf.left), 0.0, 1e-4);

  // Solo track 1 only.
  engine.postTrackMute(0, false);
  engine.postTrackSolo(0, false);
  engine.postTrackSolo(1, true);
  engine.process(buf.ptrs, 2, 512);
  CHECK_NEAR(peakOf(buf.left), 0.70710678, 1e-4);
}

MUSIO_TEST(engine, master_gain_scales_the_sum) {
  CoreEngine engine;
  engine.prepare(48000.0, 512);
  StereoBuffer buf(512);

  DcInstrument instrument;
  instrument.setSlot(0);
  engine.setTrackInstrument(0, &instrument);
  engine.postTrackActive(0, true);
  engine.postTrackGain(0, 1.0f);
  engine.postTrackPan(0, -1.0f);
  engine.postClearScheduledMidi();
  engine.postScheduledMidi(ScheduledMidiEvent::noteOn(0, 0, 60, 100));
  engine.postPlay();

  engine.postMasterGain(1.0f);
  engine.process(buf.ptrs, 2, 512);
  CHECK_NEAR(peakOf(buf.left), 1.0, 1e-4);

  engine.postMasterGain(0.25f);
  engine.process(buf.ptrs, 2, 512);
  CHECK_NEAR(peakOf(buf.left), 0.25, 1e-4);
}

MUSIO_TEST(engine, scheduled_midi_reaches_the_instrument_at_the_right_sample) {
  CoreEngine engine;
  engine.prepare(48000.0, 512);
  StereoBuffer buf(512);

  DcInstrument instrument;
  instrument.setSlot(0);
  engine.setTrackInstrument(0, &instrument);
  engine.postTrackActive(0, true);
  engine.postTrackGain(0, 1.0f);
  engine.postTrackPan(0, -1.0f);
  engine.postMasterGain(1.0f);

  // Note on at sample 200, off at 400 -- both inside the first block.
  engine.postClearScheduledMidi();
  engine.postScheduledMidi(ScheduledMidiEvent::noteOn(0, 200, 60, 100));
  engine.postScheduledMidi(ScheduledMidiEvent::noteOff(0, 400, 60));
  engine.postPlay();

  engine.process(buf.ptrs, 2, 512);
  CHECK_EQ(engine.scheduledMidiCount(), 2);

  // Silent before 200, DC in [200, 400), silent after.
  CHECK_NEAR(buf.left[0], 0.0, 1e-6);
  CHECK_NEAR(buf.left[199], 0.0, 1e-6);
  CHECK_NEAR(buf.left[200], 1.0, 1e-4);
  CHECK_NEAR(buf.left[399], 1.0, 1e-4);
  CHECK_NEAR(buf.left[400], 0.0, 1e-6);
  CHECK_NEAR(buf.left[511], 0.0, 1e-6);
}

// The engine-level counterpart of the transport invariance test: the rendered
// audio itself must not depend on the device buffer size.
MUSIO_TEST(engine, rendered_audio_is_buffer_size_invariant) {
  constexpr int kTotal = 48000;
  std::vector<std::vector<float>> renders;

  for (const int blockSize : {64, 128, 512, 1024}) {
    CoreEngine engine;
    engine.prepare(48000.0, blockSize);
    engine.postTempo(128.0);
    engine.postMetronome(true);
    engine.postMetronomeGain(1.0f);
    engine.postLoop(true, 9000, 33000);
    engine.postSeek(9000);
    engine.postPlay();

    std::vector<float> full;
    full.reserve(kTotal);
    StereoBuffer buf(blockSize);

    int produced = 0;
    while (produced < kTotal) {
      const int n = std::min(blockSize, kTotal - produced);
      engine.process(buf.ptrs, 2, n);
      for (int i = 0; i < n; ++i) full.push_back(buf.left[static_cast<std::size_t>(i)]);
      produced += n;
    }
    renders.push_back(std::move(full));
  }

  for (std::size_t r = 1; r < renders.size(); ++r) {
    CHECK_EQ(renders[r].size(), renders[0].size());
    for (std::size_t i = 0; i < renders[0].size(); ++i) {
      if (std::fabs(renders[r][i] - renders[0][i]) > 1e-5f) {
        ::musio::test::fail(MUSIO_AT, "render diverged at sample " + std::to_string(i) +
                                          ": " + std::to_string(renders[r][i]) + " vs " +
                                          std::to_string(renders[0][i]));
      }
    }
  }
}

MUSIO_TEST(engine, command_queue_overflow_is_counted_not_fatal) {
  CoreEngine engine;
  engine.prepare(48000.0, 512);

  // Flood the queue without ever running the audio thread.
  int accepted = 0;
  for (int i = 0; i < CoreEngine::kCommandQueueCapacity * 2; ++i) {
    if (engine.postTempo(120.0 + (i % 10))) ++accepted;
  }
  CHECK(accepted > 0);
  CHECK(accepted < CoreEngine::kCommandQueueCapacity * 2);
  CHECK(engine.droppedCommandCount() > 0);

  // And the engine still runs.
  StereoBuffer buf(512);
  engine.process(buf.ptrs, 2, 512);
  CHECK(engine.callbackCount() == 1);
}

MUSIO_TEST(engine, apply_project_configures_the_mixer_and_midi) {
  Project p;
  const std::string path = std::string(MUSIO_FIXTURE_DIR) + "/swift_project.json";
  CHECK(loadProjectFile(path, p).ok);

  CoreEngine engine;
  engine.prepare(p.sampleRate, 512);
  engine.applyProject(p);

  StereoBuffer buf(512);
  settle(engine, buf, 512, 16);

  CHECK_NEAR(engine.transport().tempo().bpm, 128.0, 1e-9);
  CHECK(engine.transport().loopEnabled());
  CHECK_EQ(engine.transport().loopStart(), 48000);
  CHECK_EQ(engine.transport().loopEnd(), 144000);

  // Track 0 (Drums) audible at 0.85, track 1 (Break Loop) muted.
  CHECK(engine.trackState(0).active);
  CHECK_NEAR(engine.trackState(0).gain, 0.85, 1e-6);
  CHECK_NEAR(engine.trackState(0).pan, -0.25, 1e-6);
  CHECK(!engine.trackState(0).muted);
  CHECK(engine.trackState(1).active);
  CHECK(engine.trackState(1).muted);

  // Two notes in the fixture -> two note-ons plus two note-offs.
  CHECK_EQ(engine.scheduledMidiCount(), 4);
}

MUSIO_TEST(engine, meter_snapshot_reflects_transport_state) {
  CoreEngine engine;
  engine.prepare(48000.0, 512);
  StereoBuffer buf(512);

  engine.postTempo(90.0);
  engine.postPlay();
  settle(engine, buf, 512, 4);

  const MeterPayload p = engine.meterSnapshot();
  CHECK_EQ(static_cast<int>(p.isPlaying), 1);
  CHECK_NEAR(p.tempoBpm, 90.0, 1e-9);
  CHECK_EQ(p.playHeadSamples, 2048);
  CHECK_EQ(static_cast<int>(p.bufferSize), 512);
  CHECK(p.callbackCount >= 4);
}

MUSIO_TEST(wav, writes_a_readable_header) {
  const std::string path = "/tmp/musio-test-wav.wav";

  WavWriter writer;
  std::string error;
  CHECK(writer.open(path, 48000.0, 2, WavWriter::Format::PcmInt16, error));

  std::vector<float> left(1000, 0.5f);
  std::vector<float> right(1000, -0.5f);
  const float* channels[2] = {left.data(), right.data()};
  CHECK(writer.write(channels, 2, 1000));
  CHECK_EQ(static_cast<int>(writer.framesWritten()), 1000);
  CHECK(writer.close());

  std::FILE* f = std::fopen(path.c_str(), "rb");
  CHECK(f != nullptr);
  unsigned char header[44];
  CHECK_EQ(static_cast<int>(std::fread(header, 1, 44, f)), 44);
  std::fclose(f);
  std::remove(path.c_str());

  CHECK(header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F');
  CHECK(header[8] == 'W' && header[9] == 'A' && header[10] == 'V' && header[11] == 'E');

  const std::uint32_t dataBytes = static_cast<std::uint32_t>(header[40]) |
                                  (static_cast<std::uint32_t>(header[41]) << 8) |
                                  (static_cast<std::uint32_t>(header[42]) << 16) |
                                  (static_cast<std::uint32_t>(header[43]) << 24);
  CHECK_EQ(static_cast<int>(dataBytes), 1000 * 2 * 2);  // frames * channels * int16

  const std::uint32_t riffSize = static_cast<std::uint32_t>(header[4]) |
                                 (static_cast<std::uint32_t>(header[5]) << 8) |
                                 (static_cast<std::uint32_t>(header[6]) << 16) |
                                 (static_cast<std::uint32_t>(header[7]) << 24);
  CHECK_EQ(static_cast<int>(riffSize), 36 + 1000 * 2 * 2);
}
