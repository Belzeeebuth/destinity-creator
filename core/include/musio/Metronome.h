// Metronome: beat-grid click generation, sample-accurate.
//
// Clicks are placed at round(beatIndex * samplesPerBeat) on the *timeline*, not
// relative to the current block, so a click never moves when the buffer size
// changes and loop wraps do not shift the grid.
#pragma once

#include "musio/Types.h"

namespace musio {

/// A click scheduled inside the current block.
struct ClickEvent {
  int offsetInBlock = 0;  ///< where in the rendered block the click starts
  bool accent = false;    ///< true on beat 1 of the bar
  long long beatIndex = 0;
};

/// Finds every beat whose sample position falls in [startSample, startSample+length).
/// Writes at most `maxEvents` clicks and returns how many were found.
int findClicksInRange(SampleCount startSample, int length, double samplesPerBeat,
                      int beatsPerBar, ClickEvent* out, int maxEvents) noexcept;

/// A tiny two-voice click synth. Deterministic, allocation-free, and cheap
/// enough to run unconditionally on the audio thread.
class Metronome {
 public:
  void prepare(double sampleRate) noexcept;
  void reset() noexcept;

  void setEnabled(bool enabled) noexcept { enabled_ = enabled; }
  bool isEnabled() const noexcept { return enabled_; }
  void setGain(float gain) noexcept { gain_ = clamp(gain, 0.0f, 4.0f); }
  float gain() const noexcept { return gain_; }

  /// Retrigger the click voice. Called at the exact sample offset of a beat.
  void trigger(bool accent) noexcept;

  /// Mix `length` samples of the click voice into the given stereo buffers,
  /// starting at `offset`. Silent (and nearly free) when no click is ringing.
  void renderInto(float* left, float* right, int offset, int length) noexcept;

  bool isRinging() const noexcept { return voiceSamplesLeft_ > 0; }

 private:
  double sampleRate_ = 48000.0;
  bool enabled_ = false;
  float gain_ = 0.5f;

  // Single retriggerable voice: decaying sine.
  double phase_ = 0.0;
  double phaseIncrement_ = 0.0;
  int voiceSamplesLeft_ = 0;
  int voiceLengthSamples_ = 0;
  float voiceAmplitude_ = 0.0f;
};

}  // namespace musio
