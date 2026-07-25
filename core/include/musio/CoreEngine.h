// The realtime engine, with no audio device attached.
//
// CoreEngine::process() is the entire audio callback body. It is driven by the
// JACK/ALSA backend in the engine executable, and by the unit tests and the
// `--render` CLI path offline. Same code, same results -- which is what makes
// the realtime behaviour (loop accuracy, click placement, gain staging)
// testable in CI on a machine with no sound card.
//
// Realtime contract for everything reachable from process():
//   * no allocation, no free
//   * no lock, no syscall, no logging
//   * no unbounded loop
// Buffers are sized once in prepare().
#pragma once

#include <atomic>
#include <memory>
#include <vector>

#include "musio/ClipPlayer.h"
#include "musio/Command.h"
#include "musio/MeterRing.h"
#include "musio/Metronome.h"
#include "musio/Plugin.h"
#include "musio/SpscQueue.h"
#include "musio/Transport.h"
#include "musio/Types.h"

namespace musio {

class Project;

/// Realtime mixer state for one track. Plain data; no ownership.
struct TrackRtState {
  bool active = false;
  float gain = 0.8f;
  float pan = 0.0f;
  bool muted = false;
  bool soloed = false;

  IPluginInstance* instrument = nullptr;
  IPluginInstance* effects[kMaxPluginSlotsPerTrack] = {};
  int numEffects = 0;

  float peak = 0.0f;
  float rms = 0.0f;
};

class CoreEngine {
 public:
  CoreEngine();
  ~CoreEngine();

  CoreEngine(const CoreEngine&) = delete;
  CoreEngine& operator=(const CoreEngine&) = delete;

  /// Allocate every buffer the audio thread will need. Must be called before
  /// process(), and never concurrently with it.
  void prepare(double sampleRate, int maxBlockSize);

  // --- realtime entry point ------------------------------------------------

  /// Render `numSamples` into `out` (expects >= 2 channels; mono is accepted).
  /// Output is overwritten, not accumulated.
  void process(float* const* out, int numChannels, int numSamples) noexcept;

  // --- control plane -------------------------------------------------------

  /// Enqueue a command for the audio thread. Returns false if the queue is
  /// full (the caller should treat that as backpressure, not retry in a spin).
  bool post(const Command& command);

  /// Convenience wrappers used by the RPC layer.
  bool postPlay();
  bool postStop();
  bool postPause();
  bool postSeek(SampleCount position);
  bool postTempo(double bpm);
  bool postTimeSignature(int numerator, int denominator);
  bool postLoop(bool enabled, SampleCount start, SampleCount end);
  bool postMetronome(bool enabled);
  bool postMetronomeGain(float gain);
  bool postTrackGain(TrackSlot slot, float gain);
  bool postTrackPan(TrackSlot slot, float pan);
  bool postTrackMute(TrackSlot slot, bool muted);
  bool postTrackSolo(TrackSlot slot, bool soloed);
  bool postTrackActive(TrackSlot slot, bool active);
  bool postMasterGain(float gain);
  bool postNoteOn(TrackSlot slot, int note, float velocity, int channel = 0);
  bool postNoteOff(TrackSlot slot, int note, int channel = 0);
  bool postClearScheduledMidi();

  /// Schedule one event. Events for a given playback pass must be posted in
  /// ascending samplePosition order -- the audio thread appends without
  /// sorting, so out-of-order posts would break the per-block binary search.
  bool postScheduledMidi(const ScheduledMidiEvent& event);

  /// Push a whole project's mixer state and MIDI content. Control thread only.
  void applyProject(Project& project);

  /// Hand the audio thread a new set of audio clips. Control thread only.
  ///
  /// The swap itself is a single release store, so the audio thread never sees a
  /// partially built scene. The previous scene is *not* freed immediately -- a
  /// callback already in flight may still be reading it -- it is held until two
  /// further callbacks have been observed, then released on the next publish or
  /// collectRetiredScene() call. That is why this is lock-free on both sides.
  void publishClipScene(ClipScenePtr scene);

  /// Release the previous scene if the audio thread has demonstrably moved past
  /// it. Safe to call periodically from the control thread; a no-op otherwise.
  void collectRetiredScene();

  const ClipScene* currentClipScene() const noexcept {
    return scene_.load(std::memory_order_acquire);
  }

  /// Attach a plugin instance to a track. Control thread only, and only while
  /// the transport is stopped -- there is no chain-swap fence yet.
  void setTrackInstrument(TrackSlot slot, IPluginInstance* instance);

  // --- observation ---------------------------------------------------------

  const Transport& transport() const noexcept { return transport_; }
  const Metronome& metronome() const noexcept { return metronome_; }

  /// Snapshot of the last published telemetry (also mirrored into shared
  /// memory when a MeterWriter is attached).
  MeterPayload meterSnapshot() const noexcept;

  /// Attach shared-memory publishing. Ownership stays with the caller.
  void setMeterWriter(MeterWriter* writer) noexcept { meterWriter_ = writer; }

  std::uint64_t droppedCommandCount() const noexcept {
    return droppedCommands_.load(std::memory_order_relaxed);
  }
  std::uint64_t callbackCount() const noexcept {
    return callbackCount_.load(std::memory_order_relaxed);
  }

  const TrackRtState& trackState(TrackSlot slot) const noexcept {
    return tracks_[slot < static_cast<TrackSlot>(kMaxTracks) ? slot : 0];
  }

  int scheduledMidiCount() const noexcept { return numScheduledEvents_; }

  static constexpr int kMaxScheduledEvents = 65536;
  static constexpr int kCommandQueueCapacity = 4096;

 private:
  void drainCommands() noexcept;
  void applyCommand(const Command& c) noexcept;
  void renderSegment(float* const* out, int numChannels, int outOffset,
                     const BlockSegment& segment) noexcept;
  void renderMetronome(const BlockSegment& segment, int outOffset) noexcept;
  void publishMeters(int numSamples) noexcept;
  bool anyTrackSoloed() const noexcept;

  Transport transport_;
  Metronome metronome_;

  double sampleRate_ = 48000.0;
  int maxBlockSize_ = 0;
  bool prepared_ = false;

  float masterGain_ = 1.0f;

  TrackRtState tracks_[kMaxTracks]{};

  // Pre-allocated scratch: one stereo buffer per track plus the metronome bus
  // and the master sum. Sized in prepare(), never resized afterwards.
  std::vector<float> scratch_;
  float* trackBuffer(TrackSlot slot, int channel) noexcept;
  float* clickBuffer(int channel) noexcept;
  float* masterBuffer(int channel) noexcept;

  // Fixed-capacity, ascending-order MIDI schedule.
  std::vector<ScheduledMidiEvent> scheduled_;
  int numScheduledEvents_ = 0;

  // Audio clips. `scene_` is what the audio thread reads; the two unique_ptrs are
  // control-thread ownership, including the deferred-release slot.
  std::atomic<const ClipScene*> scene_{nullptr};
  ClipScenePtr liveScene_;
  ClipScenePtr retiredScene_;
  std::uint64_t retireAfterCallback_ = 0;
  /// Scene pointer pinned for the duration of one process() call.
  const ClipScene* blockScene_ = nullptr;

  SpscQueue<Command> commands_;
  std::atomic<std::uint64_t> droppedCommands_{0};
  std::atomic<std::uint64_t> callbackCount_{0};
  std::atomic<std::uint64_t> xruns_{0};

  MeterWriter* meterWriter_ = nullptr;
  MeterPayload lastPayload_{};
  mutable std::atomic<std::uint32_t> payloadSeq_{0};
};

// ---------------------------------------------------------------------------

/// Minimal 16- or 32-bit-float WAV writer. Dependency-free on purpose: the
/// offline render path must work in a container with no audio stack at all,
/// which is how the realtime behaviour gets verified in CI.
class WavWriter {
 public:
  enum class Format { PcmInt16, Float32 };

  // Impl is opaque here, so both the constructor and the destructor have to be
  // defined out of line -- the implicit ones would need to destroy impl_ and so
  // require the complete type.
  WavWriter();
  WavWriter(const WavWriter&) = delete;
  WavWriter& operator=(const WavWriter&) = delete;

  bool open(const std::string& path, double sampleRate, int numChannels,
            Format format, std::string& error);
  /// Append a block of deinterleaved float channels.
  bool write(const float* const* channels, int numChannels, int numSamples);
  bool close();
  ~WavWriter();

  std::uint64_t framesWritten() const noexcept { return framesWritten_; }

 private:
  struct Impl;
  std::unique_ptr<Impl> impl_;
  std::uint64_t framesWritten_ = 0;
};

}  // namespace musio
