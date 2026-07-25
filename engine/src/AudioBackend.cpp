#include "AudioBackend.h"

#include <algorithm>

namespace musio {

AudioBackend::AudioBackend(CoreEngine& engine) : engine_(engine) {}

AudioBackend::~AudioBackend() { close(); }

std::vector<DeviceInfo> AudioBackend::enumerateDevices() {
  std::vector<DeviceInfo> result;

  juce::AudioDeviceManager manager;
  const auto& types = manager.getAvailableDeviceTypes();

  for (auto* type : types) {
    if (type == nullptr) continue;
    type->scanForDevices();

    const juce::StringArray names = type->getDeviceNames(false);  // outputs
    const int defaultIndex = type->getDefaultDeviceIndex(false);

    for (int i = 0; i < names.size(); ++i) {
      DeviceInfo info;
      info.backend = type->getTypeName().toStdString();
      info.name = names[i].toStdString();
      info.isDefault = (i == defaultIndex);

      // Opening the device is the only way JUCE exposes its supported rates and
      // buffer sizes. Failures are expected on a busy or absent server, so a
      // device that will not open is still listed, just without detail.
      if (auto device = std::unique_ptr<juce::AudioIODevice>(
              type->createDevice(names[i], juce::String()))) {
        for (const double rate : device->getAvailableSampleRates()) {
          info.sampleRates.push_back(rate);
        }
        for (const int size : device->getAvailableBufferSizes()) {
          info.bufferSizes.push_back(size);
        }
        info.outputChannels = device->getOutputChannelNames().size();
        info.inputChannels = device->getInputChannelNames().size();
      }

      result.push_back(std::move(info));
    }
  }

  return result;
}

bool AudioBackend::open(const Options& options, std::string& error) {
  close();

  manager_ = std::make_unique<juce::AudioDeviceManager>();

  // Preference order matters on Linux. JACK covers PipeWire and JACK proper and
  // gives the lowest latency; ALSA is the fallback for bare hardware.
  std::vector<std::string> backendsToTry;
  if (!options.backend.empty()) {
    backendsToTry.push_back(options.backend);
  } else {
    backendsToTry = {"JACK", "ALSA"};
  }

  std::string lastError;

  for (const auto& backendName : backendsToTry) {
    bool typeExists = false;
    for (auto* type : manager_->getAvailableDeviceTypes()) {
      if (type != nullptr && type->getTypeName() == juce::String(backendName)) {
        typeExists = true;
        break;
      }
    }
    if (!typeExists) {
      lastError = "backend '" + backendName + "' is not available in this build";
      continue;
    }

    manager_->setCurrentAudioDeviceType(juce::String(backendName), true);

    juce::AudioDeviceManager::AudioDeviceSetup setup;
    setup.outputDeviceName = juce::String(options.deviceName);
    setup.sampleRate = options.sampleRate;
    setup.bufferSize = options.bufferSize;
    setup.inputChannels.setRange(0, std::max(0, options.inputChannels), true);
    setup.outputChannels.setRange(0, std::max(1, options.outputChannels), true);
    setup.useDefaultInputChannels = options.inputChannels <= 0;
    setup.useDefaultOutputChannels = options.deviceName.empty();

    const juce::String result = manager_->initialise(
        std::max(0, options.inputChannels), std::max(1, options.outputChannels), nullptr,
        /*selectDefaultDeviceOnFailure=*/true, juce::String(options.deviceName), &setup);

    if (result.isEmpty() && manager_->getCurrentAudioDevice() != nullptr) {
      manager_->addAudioCallback(this);
      return true;
    }

    lastError = result.isEmpty() ? ("no device opened on " + backendName)
                                 : result.toStdString();
    manager_->closeAudioDevice();
  }

  error = lastError.empty() ? "no usable audio backend found (tried JACK and ALSA)"
                            : lastError;
  manager_.reset();
  return false;
}

void AudioBackend::close() {
  if (manager_) {
    manager_->removeAudioCallback(this);
    manager_->closeAudioDevice();
    manager_.reset();
  }
  preparedBlockSize_ = 0;
  preparedSampleRate_ = 0.0;
}

bool AudioBackend::isOpen() const {
  return manager_ && manager_->getCurrentAudioDevice() != nullptr;
}

double AudioBackend::currentSampleRate() const {
  if (!manager_) return 0.0;
  auto* device = manager_->getCurrentAudioDevice();
  return device != nullptr ? device->getCurrentSampleRate() : 0.0;
}

int AudioBackend::currentBufferSize() const {
  if (!manager_) return 0;
  auto* device = manager_->getCurrentAudioDevice();
  return device != nullptr ? device->getCurrentBufferSizeSamples() : 0;
}

std::string AudioBackend::currentDeviceName() const {
  if (!manager_) return {};
  auto* device = manager_->getCurrentAudioDevice();
  return device != nullptr ? device->getName().toStdString() : std::string{};
}

std::string AudioBackend::currentBackendName() const {
  if (!manager_) return {};
  return manager_->getCurrentAudioDeviceType().toStdString();
}

double AudioBackend::cpuLoad() const {
  return manager_ ? manager_->getCpuUsage() : 0.0;
}

void AudioBackend::audioDeviceAboutToStart(juce::AudioIODevice* device) {
  if (device == nullptr) return;

  preparedSampleRate_ = device->getCurrentSampleRate();
  preparedBlockSize_ = device->getCurrentBufferSizeSamples();

  // prepare() allocates, so it has to happen here -- before the first callback --
  // and never from inside one. JUCE guarantees this runs on the control thread
  // with the device stopped.
  engine_.prepare(preparedSampleRate_, std::max(preparedBlockSize_, 64));
}

void AudioBackend::audioDeviceStopped() {
  preparedBlockSize_ = 0;
  preparedSampleRate_ = 0.0;
}

void AudioBackend::audioDeviceIOCallbackWithContext(
    const float* const* inputChannelData, int numInputChannels,
    float* const* outputChannelData, int numOutputChannels, int numSamples,
    const juce::AudioIODeviceCallbackContext& context) {
  juce::ignoreUnused(inputChannelData, numInputChannels, context);

  if (outputChannelData == nullptr || numOutputChannels <= 0) return;

  // A device that hands us more than we prepared for would force an allocation
  // here. CoreEngine refuses instead, and we count it.
  if (numSamples > preparedBlockSize_) {
    underruns_.fetch_add(1, std::memory_order_relaxed);
  }

  engine_.process(outputChannelData, numOutputChannels, numSamples);
}

}  // namespace musio
