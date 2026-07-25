#include "AudioFileCache.h"

#include <algorithm>
#include <cmath>

namespace musio {

AudioFileCache::AudioFileCache() { formats_.registerBasicFormats(); }

std::vector<std::string> AudioFileCache::supportedExtensions() const {
  std::vector<std::string> result;
  for (int i = 0; i < formats_.getNumKnownFormats(); ++i) {
    if (auto* format = formats_.getKnownFormat(i)) {
      for (const auto& ext : format->getFileExtensions()) {
        result.push_back(ext.toStdString());
      }
    }
  }
  return result;
}

SampleBufferPtr AudioFileCache::load(const std::string& path, double targetSampleRate,
                                     std::string& error, LoadInfo* info) {
  const juce::File file{juce::String(path)};
  if (!file.existsAsFile()) {
    error = "audio file not found: " + path;
    return nullptr;
  }

  std::unique_ptr<juce::AudioFormatReader> reader(formats_.createReaderFor(file));
  if (reader == nullptr) {
    error = "no reader for " + path + " (unsupported format?)";
    return nullptr;
  }

  const auto sourceFrames = static_cast<SampleCount>(reader->lengthInSamples);
  const int channels = clamp(static_cast<int>(reader->numChannels), 1, 8);
  const double sourceRate = reader->sampleRate > 0.0 ? reader->sampleRate : targetSampleRate;

  if (sourceFrames <= 0) {
    error = "audio file is empty: " + path;
    return nullptr;
  }

  // Read the whole file. v1 is memory-resident -- see the note on
  // ClipSceneBuilder::kDefaultBudgetBytes.
  juce::AudioBuffer<float> decoded(channels, static_cast<int>(sourceFrames));
  if (!reader->read(&decoded, 0, static_cast<int>(sourceFrames), 0, true, true)) {
    error = "failed to decode " + path;
    return nullptr;
  }

  const bool needsResample =
      targetSampleRate > 0.0 && std::fabs(sourceRate - targetSampleRate) > 0.5;

  SampleCount outFrames = sourceFrames;
  if (needsResample) {
    outFrames = static_cast<SampleCount>(
        std::llround(static_cast<double>(sourceFrames) * targetSampleRate / sourceRate));
    if (outFrames <= 0) outFrames = 1;
  }

  auto buffer = std::make_unique<SampleBuffer>(
      channels, outFrames, needsResample ? targetSampleRate : sourceRate);

  if (needsResample) {
    // Resample once, here, so the audio thread never interpolates. Lagrange is
    // JUCE's standard choice for this and is good enough for file import; a
    // higher-quality offline resampler would be a later refinement.
    const double ratio = sourceRate / targetSampleRate;
    for (int ch = 0; ch < channels; ++ch) {
      juce::LagrangeInterpolator interpolator;
      interpolator.reset();
      interpolator.process(ratio, decoded.getReadPointer(ch),
                           buffer->writableChannel(ch), static_cast<int>(outFrames));
    }
  } else {
    for (int ch = 0; ch < channels; ++ch) {
      std::memcpy(buffer->writableChannel(ch), decoded.getReadPointer(ch),
                  static_cast<std::size_t>(outFrames) * sizeof(float));
    }
  }

  if (info != nullptr) {
    info->sourceSampleRate = sourceRate;
    info->sourceFrames = sourceFrames;
    info->decodedFrames = outFrames;
    info->channels = channels;
    info->resampled = needsResample;
  }

  return buffer;
}

std::string resolveAudioFilePath(const std::string& projectFilePath,
                                 const std::string& relativePath,
                                 const std::string& originalPath) {
  // 1. Relative to the project folder -- the portable case.
  if (!relativePath.empty() && !projectFilePath.empty()) {
    const juce::File projectFile{juce::String(projectFilePath)};
    const juce::File candidate =
        projectFile.getParentDirectory().getChildFile(juce::String(relativePath));
    if (candidate.existsAsFile()) return candidate.getFullPathName().toStdString();
  }

  // 2. Relative to the working directory, for a project passed by bare name.
  if (!relativePath.empty()) {
    const juce::File candidate =
        juce::File::getCurrentWorkingDirectory().getChildFile(juce::String(relativePath));
    if (candidate.existsAsFile()) return candidate.getFullPathName().toStdString();
  }

  // 3. The absolute import path. Usually a /Users/... path from macOS that will
  //    not exist here, which is exactly why it is last.
  if (!originalPath.empty()) {
    const juce::File candidate{juce::String(originalPath)};
    if (candidate.existsAsFile()) return candidate.getFullPathName().toStdString();
  }

  return {};
}

}  // namespace musio
