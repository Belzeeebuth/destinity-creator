#include "musio/Metronome.h"

#include <cmath>

namespace musio {

namespace {
constexpr double kTwoPi = 6.283185307179586476925286766559;
constexpr double kAccentHz = 1600.0;
constexpr double kNormalHz = 1000.0;
constexpr double kClickSeconds = 0.030;
}  // namespace

int findClicksInRange(SampleCount startSample, int length, double samplesPerBeat,
                      int beatsPerBar, ClickEvent* out, int maxEvents) noexcept {
  if (length <= 0 || samplesPerBeat <= 0.0 || out == nullptr || maxEvents <= 0) return 0;
  if (beatsPerBar <= 0) beatsPerBar = 4;

  const SampleCount endSample = startSample + length;

  // First beat index whose rounded sample position could be >= startSample.
  // Start one beat early and skip forward: rounding means the arithmetic index
  // is not exactly invertible, and being off by one beat here would drop a click.
  long long beat = static_cast<long long>(std::floor(static_cast<double>(startSample) / samplesPerBeat)) - 1;
  if (beat < 0) beat = 0;

  int count = 0;
  while (count < maxEvents) {
    const SampleCount pos = static_cast<SampleCount>(std::llround(static_cast<double>(beat) * samplesPerBeat));
    if (pos >= endSample) break;
    if (pos >= startSample) {
      ClickEvent ev;
      ev.offsetInBlock = static_cast<int>(pos - startSample);
      ev.accent = (beat % beatsPerBar) == 0;
      ev.beatIndex = beat;
      out[count++] = ev;
    }
    ++beat;
  }

  return count;
}

void Metronome::prepare(double sampleRate) noexcept {
  if (sampleRate > 0.0) sampleRate_ = sampleRate;
  reset();
}

void Metronome::reset() noexcept {
  phase_ = 0.0;
  phaseIncrement_ = 0.0;
  voiceSamplesLeft_ = 0;
  voiceLengthSamples_ = 0;
  voiceAmplitude_ = 0.0f;
}

void Metronome::trigger(bool accent) noexcept {
  const double hz = accent ? kAccentHz : kNormalHz;
  phase_ = 0.0;
  phaseIncrement_ = kTwoPi * hz / sampleRate_;
  voiceLengthSamples_ = static_cast<int>(kClickSeconds * sampleRate_);
  if (voiceLengthSamples_ < 1) voiceLengthSamples_ = 1;
  voiceSamplesLeft_ = voiceLengthSamples_;
  voiceAmplitude_ = accent ? 1.0f : 0.7f;
}

void Metronome::renderInto(float* left, float* right, int offset, int length) noexcept {
  if (voiceSamplesLeft_ <= 0 || length <= 0 || voiceLengthSamples_ <= 0) return;

  const int n = length < voiceSamplesLeft_ ? length : voiceSamplesLeft_;
  const float amp = voiceAmplitude_ * gain_;

  for (int i = 0; i < n; ++i) {
    // Linear-in-amplitude exponential-ish decay: cheap and click-free.
    const float t = 1.0f - static_cast<float>(voiceLengthSamples_ - voiceSamplesLeft_ + i) /
                               static_cast<float>(voiceLengthSamples_);
    const float env = t * t;
    const float s = amp * env * static_cast<float>(std::sin(phase_));
    phase_ += phaseIncrement_;
    if (phase_ >= kTwoPi) phase_ -= kTwoPi;

    if (left != nullptr) left[offset + i] += s;
    if (right != nullptr) right[offset + i] += s;
  }

  voiceSamplesLeft_ -= n;
}

}  // namespace musio
