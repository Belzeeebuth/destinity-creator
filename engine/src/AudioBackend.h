// JACK / ALSA audio device layer.
//
// This is the *only* file that knows how audio reaches the speakers. It owns a
// juce::AudioDeviceManager and forwards each device callback straight into
// CoreEngine::process(). It contains no musical logic at all -- transport,
// metronome, mixing and MIDI scheduling all live in musio-core, which is why
// they can be tested without a sound card.
#pragma once

#include <memory>
#include <string>
#include <vector>

#include <juce_audio_devices/juce_audio_devices.h>

#include "musio/CoreEngine.h"

namespace musio {

struct DeviceInfo {
  std::string backend;   ///< "JACK" or "ALSA"
  std::string name;
  bool isDefault = false;
  std::vector<double> sampleRates;
  std::vector<int> bufferSizes;
  int outputChannels = 0;
  int inputChannels = 0;
};

class AudioBackend : private juce::AudioIODeviceCallback {
 public:
  struct Options {
    /// Empty means "the backend's default device".
    std::string backend;  ///< "JACK", "ALSA", or empty to try JACK then ALSA
    std::string deviceName;
    double sampleRate = 48000.0;
    int bufferSize = 512;
    int outputChannels = 2;
    int inputChannels = 0;
  };

  explicit AudioBackend(CoreEngine& engine);
  ~AudioBackend() override;

  /// Enumerate everything available without opening a device. Safe on a machine
  /// with no audio server -- it just returns fewer entries.
  static std::vector<DeviceInfo> enumerateDevices();

  bool open(const Options& options, std::string& error);
  void close();
  bool isOpen() const;

  double currentSampleRate() const;
  int currentBufferSize() const;
  std::string currentDeviceName() const;
  std::string currentBackendName() const;

  /// Rolling average of callback time / callback budget, 0..1.
  double cpuLoad() const;
  std::uint64_t underrunCount() const { return underruns_.load(std::memory_order_relaxed); }

 private:
  void audioDeviceAboutToStart(juce::AudioIODevice* device) override;
  void audioDeviceStopped() override;
  void audioDeviceIOCallbackWithContext(const float* const* inputChannelData,
                                        int numInputChannels,
                                        float* const* outputChannelData,
                                        int numOutputChannels, int numSamples,
                                        const juce::AudioIODeviceCallbackContext& context) override;

  CoreEngine& engine_;
  std::unique_ptr<juce::AudioDeviceManager> manager_;
  std::atomic<std::uint64_t> underruns_{0};
  int preparedBlockSize_ = 0;
  double preparedSampleRate_ = 0.0;
};

}  // namespace musio
