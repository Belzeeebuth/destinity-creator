// VST3 / LV2 plugin hosting, implemented against musio-core's POD seam.
//
// The whole point of Plugin.h is that musio-core never learns what a VST3 is.
// This file is where the format-specific typing is allowed to exist, and it
// converts in both directions:
//
//     juce::PluginDescription  <->  musio::PluginDescriptor   (opaque uid)
//     juce::AudioPluginInstance <-> musio::IPluginInstance     (opaque handle)
//
// Nothing above this layer can obtain a juce:: type from a PluginRef, so the
// realtime engine and the project model stay format-agnostic by construction.
#pragma once

#include <map>
#include <memory>
#include <string>
#include <vector>

#include <juce_audio_processors/juce_audio_processors.h>

#include "musio/Plugin.h"

namespace musio {

class JucePluginHost final : public IPluginHost {
 public:
  JucePluginHost();
  ~JucePluginHost() override;

  /// Directories searched when no explicit path list is given. These are the
  /// conventional Linux locations, which is why VST3 is the practical baseline
  /// format here rather than AudioUnit.
  static std::vector<std::string> defaultSearchPaths();

  void setSearchPaths(const std::vector<std::string>& paths);

  int scan(bool rescanAll) override;
  int numKnownPlugins() const override;
  bool describePlugin(int index, PluginDescriptor& out) const override;

  PluginRef instantiate(const char* uid, double sampleRate, int maxBlockSize,
                        std::string& error) override;
  void destroyInstance(PluginRef ref) override;
  IPluginInstance* instance(PluginRef ref) override;

  /// Human-readable list of formats this build can actually host. Reported by
  /// the RPC `engine.status` call so the UI never offers a format the engine
  /// cannot load.
  static std::vector<std::string> supportedFormats();

  const std::string& lastScanError() const { return lastScanError_; }

 private:
  class Instance;

  juce::AudioPluginFormatManager formats_;
  juce::KnownPluginList known_;
  juce::StringArray searchPaths_;
  std::map<PluginRef, std::unique_ptr<Instance>> instances_;
  PluginRef nextRef_ = 1;
  std::string lastScanError_;
};

}  // namespace musio
