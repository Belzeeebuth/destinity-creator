// The plugin seam.
//
// This file is the direct fix for the defect that stalled the upstream Windows
// port. There, AudioBackendProtocol.swift -- the file whose whole purpose was
// to abstract the backend -- did `import AVFoundation` and put Apple types in
// its own signatures:
//
//     func loadInstrument(_ description: AudioComponentDescription, ...) -> AudioUnit
//
// which means no non-Apple backend can conform to it without rewriting the
// protocol. The seam has to be plain data.
//
// So: nothing here references JUCE, VST3, CLAP, CoreAudio or any concrete
// format. Plugins are identified by an opaque handle and described by a POD
// struct with fixed-size fields. musio-core is compiled with no include path
// to any plugin SDK, which makes the rule mechanically enforced rather than a
// matter of discipline.
#pragma once

#include <cstdint>
#include <cstring>
#include <type_traits>

#include "musio/Command.h"  // ScheduledMidiEvent, used in process()
#include "musio/Types.h"

namespace musio {

/// Opaque plugin instance handle minted by the host layer. 0 is "none".
using PluginRef = std::uint64_t;
inline constexpr PluginRef kNoPlugin = 0;

enum class PluginFormat : std::uint32_t { Unknown = 0, VST3, CLAP, LV2 };
enum class PluginKind : std::uint32_t { Unknown = 0, Instrument, Effect };

inline constexpr int kPluginUidChars = 96;
inline constexpr int kPluginNameChars = 128;
inline constexpr int kPluginPathChars = 512;

/// Everything the UI and the project file need to know about a plugin, with no
/// format-specific typing. `uid` is an opaque, format-defined identifier that
/// only the host layer interprets -- core just stores and compares it.
struct PluginDescriptor {
  char uid[kPluginUidChars]{};
  char name[kPluginNameChars]{};
  char vendor[kPluginNameChars]{};
  char path[kPluginPathChars]{};
  PluginFormat format = PluginFormat::Unknown;
  PluginKind kind = PluginKind::Unknown;
  std::uint32_t numInputChannels = 0;
  std::uint32_t numOutputChannels = 0;
  std::uint32_t hasEditor = 0;

  void setUid(const char* s) noexcept { copyField(uid, kPluginUidChars, s); }
  void setName(const char* s) noexcept { copyField(name, kPluginNameChars, s); }
  void setVendor(const char* s) noexcept { copyField(vendor, kPluginNameChars, s); }
  void setPath(const char* s) noexcept { copyField(path, kPluginPathChars, s); }

 private:
  static void copyField(char* dst, int cap, const char* src) noexcept {
    if (src == nullptr) {
      dst[0] = '\0';
      return;
    }
    std::size_t n = std::strlen(src);
    if (n >= static_cast<std::size_t>(cap)) n = static_cast<std::size_t>(cap) - 1;
    std::memcpy(dst, src, n);
    dst[n] = '\0';
  }
};

static_assert(std::is_trivially_copyable_v<PluginDescriptor>);

/// Realtime-side plugin interface. The audio thread calls only these, and each
/// implementation promises they are allocation- and lock-free.
///
/// Note there is no `getNativeHandle()` escape hatch: that is exactly how the
/// Apple types leaked upstream.
class IPluginInstance {
 public:
  virtual ~IPluginInstance() = default;

  virtual void prepare(double sampleRate, int maxBlockSize) = 0;
  virtual void release() = 0;

  /// In-place stereo processing. `midi` may be null for effects.
  virtual void process(float* const* channels, int numChannels, int numSamples,
                       const ScheduledMidiEvent* midi, int numMidiEvents,
                       SampleCount blockStartSample) = 0;

  virtual void reset() = 0;
  virtual int numParameters() const = 0;
  virtual float parameter(int index) const = 0;
  virtual void setParameter(int index, float value) = 0;
  virtual bool isBypassed() const = 0;
  virtual void setBypassed(bool bypassed) = 0;
};

/// Control-plane plugin host interface. Scanning and instantiation are slow,
/// blocking, possibly-crashing operations and never happen on the audio thread.
class IPluginHost {
 public:
  virtual ~IPluginHost() = default;

  /// Rescan plugin directories. Returns the number of plugins found.
  virtual int scan(bool rescanAll) = 0;
  virtual int numKnownPlugins() const = 0;
  virtual bool describePlugin(int index, PluginDescriptor& out) const = 0;

  /// Instantiate by opaque uid. Returns kNoPlugin on failure; `error` receives
  /// a human-readable reason.
  virtual PluginRef instantiate(const char* uid, double sampleRate, int maxBlockSize,
                                std::string& error) = 0;
  virtual void destroyInstance(PluginRef ref) = 0;
  virtual IPluginInstance* instance(PluginRef ref) = 0;
};

}  // namespace musio
