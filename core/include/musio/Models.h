// Project model, transposed from DAWCore's Swift models.
//
// Two deliberate choices here:
//
// 1. Enum-like fields (track type, colour, marker type, fade curve, plugin
//    type) are kept as strings rather than C++ enums. The upstream Swift enums
//    are `String`-backed and will keep gaining cases; storing the raw token
//    means an unknown value from a newer project file is preserved instead of
//    being clamped to a default.
//
// 2. Every model keeps the JSON object it was parsed from. Saving re-emits that
//    object with only the fields we actually understand overwritten. A DAW that
//    silently drops a user's plugin state or automation on load-then-save is
//    worse than one that cannot open the file at all, and this codebase does
//    not model plugin state blobs yet.
#pragma once

#include <optional>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

#include "musio/Types.h"

namespace musio {

using Json = nlohmann::json;

// ---------------------------------------------------------------------------

struct MidiNote {
  Uuid id{};
  double beatPosition = 0.0;
  double durationBeats = 0.0;
  std::uint8_t pitch = 60;
  std::uint8_t velocity = 100;
  std::uint8_t channel = 0;
};

struct MidiClipData {
  std::vector<MidiNote> notes;
  std::optional<double> originalTempo;
  /// Non-note events (CC, pitch bend, sysex) are preserved verbatim; the engine
  /// does not interpret them yet.
  std::vector<Json> otherEvents;
};

struct AudioFileReference {
  Uuid fileId{};
  std::string originalPath;
  std::string relativePath;
  double sampleRate = 48000.0;
  int channelCount = 2;
  SampleCount lengthInSamples = 0;
  int bitDepth = 24;
};

struct AudioClipData {
  AudioFileReference fileReference{};
  SampleCount sourceStartSample = 0;
  SampleCount sourceLengthSamples = 0;
  float pitchShift = 0.0f;
  float timeStretch = 1.0f;
  bool preservePitch = true;
};

enum class ClipContentKind { Empty, Audio, Midi };

struct Clip {
  Uuid id{};
  std::string name;
  TimeRange timeRange{};
  ClipContentKind kind = ClipContentKind::Empty;
  MidiClipData midi{};
  AudioClipData audio{};
  SampleCount fadeInDuration = 0;
  SampleCount fadeOutDuration = 0;
  std::string fadeInCurve = "linear";
  std::string fadeOutCurve = "linear";
  bool isLooped = false;
  bool isMuted = false;

  Json raw = Json::object();
};

struct PluginSlotModel {
  Uuid id{};
  bool isEnabled = true;
  /// Empty when the slot is empty.
  std::string pluginType;    ///< e.g. "vst3Effect", "audioUnitInstrument"
  std::string manufacturer;
  std::string name;
  std::string uniqueID;      ///< AU subtype or VST3 class id -- opaque to core

  Json raw = Json::object();
};

struct Track {
  Uuid id{};
  std::string name;
  std::string type = "audio";   ///< audio | midi | instrument | bus | master
  std::string color = "blue";
  float volume = 0.8f;          ///< linear 0..1
  float pan = 0.0f;             ///< -1..1
  bool isMuted = false;
  bool isSolo = false;
  bool isArmed = false;
  std::vector<Clip> clips;
  std::optional<PluginSlotModel> instrumentSlot;
  std::vector<PluginSlotModel> pluginSlots;
  double height = 80.0;
  bool isExpanded = true;

  Json raw = Json::object();

  /// Realtime slot index assigned when the project is handed to the engine.
  /// Not persisted -- it is an engine-side detail, not project data.
  TrackSlot slot = kInvalidSlot;
};

struct Marker {
  Uuid id{};
  std::string name;
  double beatPosition = 0.0;
  std::string color = "blue";
  std::string type = "generic";
};

struct Project {
  Uuid id{};
  std::string name = "Untitled";
  std::string createdAt;   ///< ISO8601, as written by Foundation
  std::string modifiedAt;  ///< ISO8601

  Tempo tempo{};
  TimeSignature timeSignature{};
  double sampleRate = 48000.0;

  std::vector<Track> tracks;
  std::optional<Track> masterTrack;
  std::vector<Marker> markers;

  std::optional<TimeRange> loopRegion;
  bool isLoopEnabled = false;

  std::vector<AudioFileReference> audioFiles;

  int formatVersion = 1;

  Json raw = Json::object();

  static constexpr int kCurrentFormatVersion = 1;

  /// A minimal but valid project: one audio track, 120 bpm, 4/4.
  static Project makeDefault(const std::string& projectName = "Untitled");

  Track* findTrack(const Uuid& trackId) noexcept;
  Track* findTrackBySlot(TrackSlot slot) noexcept;

  /// Assign dense realtime slots to every track, in order. Called once before
  /// the project is pushed to the engine.
  void assignSlots() noexcept;

  /// Timeline length in samples: the end of the last clip.
  SampleCount durationInSamples() const noexcept;
};

/// Current UTC time in the ISO8601 form Foundation's JSONEncoder emits
/// (e.g. "2026-07-25T19:31:04Z").
std::string iso8601Now();

}  // namespace musio
