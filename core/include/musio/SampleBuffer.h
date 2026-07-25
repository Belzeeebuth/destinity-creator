// Owned, deinterleaved, immutable-once-published audio.
//
// Decoded audio lives here. The control plane fills a SampleBuffer, publishes it
// as part of a ClipScene, and never touches it again -- which is what makes it
// safe for the audio thread to read without any synchronisation beyond the
// scene pointer swap.
#pragma once

#include <cstring>
#include <memory>
#include <vector>

#include "musio/Types.h"

namespace musio {

class SampleBuffer {
 public:
  SampleBuffer() = default;

  SampleBuffer(int numChannels, SampleCount numFrames, double sampleRate)
      : numChannels_(clamp(numChannels, 1, 8)),
        numFrames_(numFrames < 0 ? 0 : numFrames),
        sampleRate_(sampleRate > 0.0 ? sampleRate : 48000.0) {
    storage_.assign(static_cast<std::size_t>(numChannels_) *
                        static_cast<std::size_t>(numFrames_),
                    0.0f);
    channels_.resize(static_cast<std::size_t>(numChannels_));
    for (int ch = 0; ch < numChannels_; ++ch) {
      channels_[static_cast<std::size_t>(ch)] =
          storage_.data() + static_cast<std::size_t>(ch) * static_cast<std::size_t>(numFrames_);
    }
  }

  SampleBuffer(const SampleBuffer&) = delete;
  SampleBuffer& operator=(const SampleBuffer&) = delete;
  SampleBuffer(SampleBuffer&&) = default;
  SampleBuffer& operator=(SampleBuffer&&) = default;

  int numChannels() const noexcept { return numChannels_; }
  SampleCount numFrames() const noexcept { return numFrames_; }
  double sampleRate() const noexcept { return sampleRate_; }
  bool isEmpty() const noexcept { return numFrames_ == 0 || numChannels_ == 0; }

  /// Read-only channel pointer, valid for numFrames() samples. Null for an
  /// out-of-range channel rather than undefined behaviour: the audio thread must
  /// be able to ask without checking first.
  const float* channel(int index) const noexcept {
    if (index < 0 || index >= numChannels_) return nullptr;
    return channels_[static_cast<std::size_t>(index)];
  }

  /// Writable access, for the control thread only, before publication.
  float* writableChannel(int index) noexcept {
    if (index < 0 || index >= numChannels_) return nullptr;
    return channels_[static_cast<std::size_t>(index)];
  }

  /// Bytes this buffer occupies -- used to enforce the project-wide preload
  /// budget, since v1 keeps clip audio memory-resident.
  std::size_t sizeInBytes() const noexcept { return storage_.size() * sizeof(float); }

 private:
  int numChannels_ = 0;
  SampleCount numFrames_ = 0;
  double sampleRate_ = 48000.0;
  std::vector<float> storage_;
  std::vector<float*> channels_;
};

using SampleBufferPtr = std::unique_ptr<SampleBuffer>;

}  // namespace musio
