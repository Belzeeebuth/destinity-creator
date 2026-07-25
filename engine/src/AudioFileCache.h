// Audio file decoding.
//
// The one place that knows about file formats. musio-core receives finished
// SampleBuffers and has no idea whether they came from WAV, FLAC, Ogg or a test
// fixture -- the same reason the plugin seam is plain data.
//
// Decoding happens on the control thread, never the audio thread. Files are
// resampled here if their rate differs from the engine's, so the realtime path
// never has to interpolate.
#pragma once

#include <map>
#include <memory>
#include <string>
#include <vector>

#include <juce_audio_formats/juce_audio_formats.h>

#include "musio/SampleBuffer.h"

namespace musio {

class AudioFileCache {
 public:
  AudioFileCache();

  struct LoadInfo {
    double sourceSampleRate = 0.0;
    SampleCount sourceFrames = 0;
    SampleCount decodedFrames = 0;
    int channels = 0;
    bool resampled = false;
  };

  /// Decode `path`, resampling to `targetSampleRate` when needed.
  /// Returns null on failure with a reason in `error`.
  SampleBufferPtr load(const std::string& path, double targetSampleRate,
                       std::string& error, LoadInfo* info = nullptr);

  /// Formats this build can read, for diagnostics.
  std::vector<std::string> supportedExtensions() const;

 private:
  juce::AudioFormatManager formats_;
};

/// Resolve a clip's audio file on disk.
///
/// Projects store both a `relativePath` (inside the project folder) and the
/// `originalPath` it was imported from. Prefer the relative one so a project
/// folder stays portable, and fall back to the absolute one -- which is what
/// makes a project written on macOS openable here, since its originalPath will
/// not exist but its relativePath will.
std::string resolveAudioFilePath(const std::string& projectFilePath,
                                 const std::string& relativePath,
                                 const std::string& originalPath);

}  // namespace musio
