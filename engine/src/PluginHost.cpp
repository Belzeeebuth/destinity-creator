#include "PluginHost.h"

#include <algorithm>

namespace musio {

// ---------------------------------------------------------------------------
// Instance: adapts a juce::AudioPluginInstance to musio::IPluginInstance.
// ---------------------------------------------------------------------------

class JucePluginHost::Instance final : public IPluginInstance {
 public:
  explicit Instance(std::unique_ptr<juce::AudioPluginInstance> plugin)
      : plugin_(std::move(plugin)) {}

  void prepare(double sampleRate, int maxBlockSize) override {
    if (!plugin_) return;
    plugin_->setRateAndBufferSizeDetails(sampleRate, maxBlockSize);
    plugin_->prepareToPlay(sampleRate, maxBlockSize);
    // Scratch space so process() never has to allocate.
    buffer_.setSize(std::max(2, plugin_->getTotalNumOutputChannels()), maxBlockSize,
                    false, true, true);
    midi_.ensureSize(2048);
  }

  void release() override {
    if (plugin_) plugin_->releaseResources();
  }

  void reset() override {
    if (plugin_) plugin_->reset();
  }

  void process(float* const* channels, int numChannels, int numSamples,
               const ScheduledMidiEvent* midi, int numMidiEvents,
               SampleCount blockStartSample) override {
    if (!plugin_ || numSamples <= 0) return;

    midi_.clear();
    for (int i = 0; i < numMidiEvents; ++i) {
      const auto& ev = midi[i];
      if (ev.slot != slot_) continue;
      const int offset =
          clamp(static_cast<int>(ev.samplePosition - blockStartSample), 0, numSamples - 1);
      midi_.addEvent(juce::MidiMessage(ev.status, ev.data1, ev.data2), offset);
    }

    // Wrap the caller's memory rather than copying: JUCE processes in place.
    const int channelsToUse = std::min(numChannels, buffer_.getNumChannels());
    juce::AudioBuffer<float> view(const_cast<float**>(channels), channelsToUse, numSamples);

    if (bypassed_) return;
    plugin_->processBlock(view, midi_);
  }

  int numParameters() const override {
    return plugin_ ? plugin_->getParameters().size() : 0;
  }

  float parameter(int index) const override {
    if (!plugin_) return 0.0f;
    const auto& params = plugin_->getParameters();
    if (index < 0 || index >= params.size()) return 0.0f;
    return params[index]->getValue();
  }

  void setParameter(int index, float value) override {
    if (!plugin_) return;
    const auto& params = plugin_->getParameters();
    if (index < 0 || index >= params.size()) return;
    params[index]->setValueNotifyingHost(clamp(value, 0.0f, 1.0f));
  }

  bool isBypassed() const override { return bypassed_; }
  void setBypassed(bool bypassed) override { bypassed_ = bypassed; }

  void setSlot(TrackSlot slot) { slot_ = slot; }
  juce::AudioPluginInstance* raw() { return plugin_.get(); }

 private:
  std::unique_ptr<juce::AudioPluginInstance> plugin_;
  juce::AudioBuffer<float> buffer_;
  juce::MidiBuffer midi_;
  TrackSlot slot_ = 0;
  bool bypassed_ = false;
};

// ---------------------------------------------------------------------------
// JucePluginHost
// ---------------------------------------------------------------------------

JucePluginHost::JucePluginHost() {
  formats_.addDefaultFormats();
  for (const auto& path : defaultSearchPaths()) searchPaths_.add(juce::String(path));
}

JucePluginHost::~JucePluginHost() { instances_.clear(); }

std::vector<std::string> JucePluginHost::defaultSearchPaths() {
  // The conventional Linux VST3 and LV2 locations, per the VST3 SDK's
  // documented layout and the LV2 spec.
  std::vector<std::string> paths;
  const juce::String home = juce::File::getSpecialLocation(juce::File::userHomeDirectory)
                                .getFullPathName();
  paths.push_back((home + "/.vst3").toStdString());
  paths.push_back("/usr/lib/vst3");
  paths.push_back("/usr/local/lib/vst3");
  paths.push_back((home + "/.lv2").toStdString());
  paths.push_back("/usr/lib/lv2");
  paths.push_back("/usr/local/lib/lv2");
  return paths;
}

void JucePluginHost::setSearchPaths(const std::vector<std::string>& paths) {
  searchPaths_.clear();
  for (const auto& p : paths) searchPaths_.add(juce::String(p));
}

std::vector<std::string> JucePluginHost::supportedFormats() {
  std::vector<std::string> formats;
#if JUCE_PLUGINHOST_VST3
  formats.push_back("VST3");
#endif
#if JUCE_PLUGINHOST_LV2
  formats.push_back("LV2");
#endif
  // CLAP is deliberately absent: the headers are vendored for a future host
  // implementation, but JUCE cannot host CLAP and nothing here does yet.
  // Reporting it would mean the UI offering a format the engine will refuse.
  return formats;
}

int JucePluginHost::scan(bool rescanAll) {
  lastScanError_.clear();

  if (rescanAll) known_.clear();

  juce::FileSearchPath searchPath;
  for (const auto& p : searchPaths_) {
    const juce::File dir(p);
    if (dir.isDirectory()) searchPath.add(dir);
  }

  if (searchPath.getNumPaths() == 0) {
    lastScanError_ = "none of the configured plugin directories exist";
    return known_.getNumTypes();
  }

  for (int i = 0; i < formats_.getNumFormats(); ++i) {
    auto* format = formats_.getFormat(i);
    if (format == nullptr) continue;

    // Only scan formats this build can actually load.
    const std::string name = format->getName().toStdString();
    const auto supported = supportedFormats();
    if (std::find(supported.begin(), supported.end(), name) == supported.end()) continue;

    juce::PluginDirectoryScanner scanner(known_, *format,
                                         format->getDefaultLocationsToSearch(),
                                         /*recursive=*/true, juce::File());

    juce::String pluginBeingScanned;
    // Bounded: scanNextFile returns false once the directory list is exhausted.
    while (scanner.scanNextFile(/*dontRescanIfAlreadyInList=*/true, pluginBeingScanned)) {
      // Intentionally empty: KnownPluginList accumulates the results.
    }

    const auto failures = scanner.getFailedFiles();
    if (!failures.isEmpty()) {
      lastScanError_ = std::to_string(failures.size()) + " plugin(s) failed to load";
    }
  }

  return known_.getNumTypes();
}

int JucePluginHost::numKnownPlugins() const { return known_.getNumTypes(); }

bool JucePluginHost::describePlugin(int index, PluginDescriptor& out) const {
  const auto types = known_.getTypes();
  if (index < 0 || index >= types.size()) return false;

  const juce::PluginDescription& d = types.getReference(index);

  out = PluginDescriptor{};
  // createIdentifierString() is the format's own opaque identity. Core stores
  // and compares it but never parses it -- that is what keeps the seam clean.
  out.setUid(d.createIdentifierString().toRawUTF8());
  out.setName(d.name.toRawUTF8());
  out.setVendor(d.manufacturerName.toRawUTF8());
  out.setPath(d.fileOrIdentifier.toRawUTF8());

  if (d.pluginFormatName == "VST3") {
    out.format = PluginFormat::VST3;
  } else if (d.pluginFormatName == "LV2") {
    out.format = PluginFormat::LV2;
  } else if (d.pluginFormatName == "CLAP") {
    out.format = PluginFormat::CLAP;
  } else {
    out.format = PluginFormat::Unknown;
  }

  out.kind = d.isInstrument ? PluginKind::Instrument : PluginKind::Effect;
  out.numInputChannels = static_cast<std::uint32_t>(std::max(0, d.numInputChannels));
  out.numOutputChannels = static_cast<std::uint32_t>(std::max(0, d.numOutputChannels));
  out.hasEditor = 1;  // resolved for real once the instance exists
  return true;
}

PluginRef JucePluginHost::instantiate(const char* uid, double sampleRate, int maxBlockSize,
                                      std::string& error) {
  if (uid == nullptr || *uid == '\0') {
    error = "empty plugin uid";
    return kNoPlugin;
  }

  const juce::String wanted(uid);
  const auto types = known_.getTypes();

  for (int i = 0; i < types.size(); ++i) {
    const juce::PluginDescription& d = types.getReference(i);
    if (d.createIdentifierString() != wanted) continue;

    juce::String jerror;
    auto plugin = formats_.createPluginInstance(d, sampleRate, maxBlockSize, jerror);
    if (plugin == nullptr) {
      error = jerror.isEmpty() ? "plugin failed to instantiate" : jerror.toStdString();
      return kNoPlugin;
    }

    auto wrapper = std::make_unique<Instance>(std::move(plugin));
    wrapper->prepare(sampleRate, maxBlockSize);

    const PluginRef ref = nextRef_++;
    instances_.emplace(ref, std::move(wrapper));
    return ref;
  }

  error = "no known plugin with uid '" + std::string(uid) + "' (run plugins.scan first)";
  return kNoPlugin;
}

void JucePluginHost::destroyInstance(PluginRef ref) {
  const auto it = instances_.find(ref);
  if (it == instances_.end()) return;
  it->second->release();
  instances_.erase(it);
}

IPluginInstance* JucePluginHost::instance(PluginRef ref) {
  const auto it = instances_.find(ref);
  return it == instances_.end() ? nullptr : it->second.get();
}

}  // namespace musio
