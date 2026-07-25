#include "musio/Persistence.h"

#include <fstream>
#include <sstream>

namespace musio {

namespace {

// --- small readers that never throw -----------------------------------------

double readDouble(const Json& j, const char* key, double fallback) {
  if (!j.is_object() || !j.contains(key)) return fallback;
  const Json& v = j.at(key);
  return v.is_number() ? v.get<double>() : fallback;
}

std::int64_t readInt64(const Json& j, const char* key, std::int64_t fallback) {
  if (!j.is_object() || !j.contains(key)) return fallback;
  const Json& v = j.at(key);
  return v.is_number() ? v.get<std::int64_t>() : fallback;
}

int readInt(const Json& j, const char* key, int fallback) {
  return static_cast<int>(readInt64(j, key, fallback));
}

bool readBool(const Json& j, const char* key, bool fallback) {
  if (!j.is_object() || !j.contains(key)) return fallback;
  const Json& v = j.at(key);
  return v.is_boolean() ? v.get<bool>() : fallback;
}

std::string readString(const Json& j, const char* key, const std::string& fallback = {}) {
  if (!j.is_object() || !j.contains(key)) return fallback;
  const Json& v = j.at(key);
  return v.is_string() ? v.get<std::string>() : fallback;
}

std::uint8_t readU8(const Json& j, const char* key, std::uint8_t fallback) {
  const std::int64_t v = readInt64(j, key, fallback);
  return static_cast<std::uint8_t>(clamp<std::int64_t>(v, 0, 255));
}

/// Swift synthesises enum-with-payload cases as a single-key object. Returns the
/// case name and its payload object, or empty when the shape does not match.
bool readTaggedCase(const Json& j, std::string& caseName, const Json** payload) {
  if (!j.is_object() || j.size() != 1) return false;
  auto it = j.begin();
  caseName = it.key();
  *payload = &it.value();
  return true;
}

/// Unlabelled associated values are keyed "_0" by the Swift compiler.
const Json* unlabelledPayload(const Json& payload) {
  if (payload.is_object() && payload.contains("_0")) return &payload.at("_0");
  return nullptr;
}

}  // namespace

// ---------------------------------------------------------------------------
// UUID / TimePosition
// ---------------------------------------------------------------------------

Json uuidToJson(const Uuid& id) { return Json(id.toString()); }

Json wrappedIdToJson(const Uuid& id) {
  Json j = Json::object();
  j["rawValue"] = id.toString();
  return j;
}

bool uuidFromJson(const Json& node, Uuid& out) {
  // Accepts both a bare UUID string and Swift's single-property wrapper form.
  if (node.is_string()) return Uuid::parse(node.get<std::string>(), out);
  if (node.is_object() && node.contains("rawValue")) {
    const Json& inner = node.at("rawValue");
    if (inner.is_string()) return Uuid::parse(inner.get<std::string>(), out);
  }
  return false;
}

Json timePositionToJson(const TimePosition& t) {
  Json j = Json::object();
  j["samples"] = t.samples;
  j["sampleRate"] = t.sampleRate;
  return j;
}

bool timePositionFromJson(const Json& node, TimePosition& out) {
  if (!node.is_object()) return false;
  out.samples = readInt64(node, "samples", 0);
  out.sampleRate = readDouble(node, "sampleRate", 48000.0);
  return true;
}

namespace {

Json timeRangeToJson(const TimeRange& r) {
  Json j = Json::object();
  j["start"] = timePositionToJson(r.start);
  j["duration"] = timePositionToJson(r.duration);
  return j;
}

bool timeRangeFromJson(const Json& node, double sampleRate, TimeRange& out) {
  if (!node.is_object()) return false;
  out.start.sampleRate = sampleRate;
  out.duration.sampleRate = sampleRate;
  if (node.contains("start")) timePositionFromJson(node.at("start"), out.start);
  if (node.contains("duration")) timePositionFromJson(node.at("duration"), out.duration);
  return true;
}

// --- MIDI -------------------------------------------------------------------

Json midiNoteToJson(const MidiNote& n) {
  Json note = Json::object();
  note["pitch"] = n.pitch;
  note["velocity"] = n.velocity;
  note["duration"] = n.durationBeats;

  Json type = Json::object();
  type["note"] = Json::object({{"_0", std::move(note)}});

  Json ev = Json::object();
  ev["id"] = uuidToJson(n.id);
  ev["beatPosition"] = n.beatPosition;
  ev["channel"] = n.channel;
  ev["type"] = std::move(type);
  return ev;
}

Json midiClipDataToJson(const MidiClipData& m) {
  Json events = Json::array();
  for (const auto& n : m.notes) events.push_back(midiNoteToJson(n));
  for (const auto& other : m.otherEvents) events.push_back(other);

  Json j = Json::object();
  j["events"] = std::move(events);
  if (m.originalTempo.has_value()) j["originalTempo"] = *m.originalTempo;
  return j;
}

void midiClipDataFromJson(const Json& node, MidiClipData& out) {
  out.notes.clear();
  out.otherEvents.clear();

  if (node.contains("originalTempo") && node.at("originalTempo").is_number()) {
    out.originalTempo = node.at("originalTempo").get<double>();
  }

  if (!node.contains("events") || !node.at("events").is_array()) return;

  for (const auto& ev : node.at("events")) {
    if (!ev.is_object() || !ev.contains("type")) continue;

    std::string caseName;
    const Json* payload = nullptr;
    if (!readTaggedCase(ev.at("type"), caseName, &payload) || caseName != "note") {
      // CC, pitch bend, sysex and anything a future version adds: keep the raw
      // object so saving does not destroy it.
      out.otherEvents.push_back(ev);
      continue;
    }

    const Json* noteData = unlabelledPayload(*payload);
    if (noteData == nullptr || !noteData->is_object()) {
      out.otherEvents.push_back(ev);
      continue;
    }

    MidiNote n;
    uuidFromJson(ev.contains("id") ? ev.at("id") : Json(), n.id);
    n.beatPosition = readDouble(ev, "beatPosition", 0.0);
    n.channel = readU8(ev, "channel", 0);
    n.pitch = readU8(*noteData, "pitch", 60);
    n.velocity = readU8(*noteData, "velocity", 100);
    n.durationBeats = readDouble(*noteData, "duration", 0.0);
    out.notes.push_back(n);
  }
}

// --- audio ------------------------------------------------------------------

Json audioFileRefToJson(const AudioFileReference& a) {
  Json j = Json::object();
  j["fileID"] = uuidToJson(a.fileId);
  j["originalPath"] = a.originalPath;
  j["relativePath"] = a.relativePath;
  j["sampleRate"] = a.sampleRate;
  j["channelCount"] = a.channelCount;
  j["lengthInSamples"] = a.lengthInSamples;
  j["bitDepth"] = a.bitDepth;
  return j;
}

void audioFileRefFromJson(const Json& node, AudioFileReference& out) {
  if (!node.is_object()) return;
  if (node.contains("fileID")) uuidFromJson(node.at("fileID"), out.fileId);
  out.originalPath = readString(node, "originalPath");
  out.relativePath = readString(node, "relativePath");
  out.sampleRate = readDouble(node, "sampleRate", 48000.0);
  out.channelCount = readInt(node, "channelCount", 2);
  out.lengthInSamples = readInt64(node, "lengthInSamples", 0);
  out.bitDepth = readInt(node, "bitDepth", 24);
}

Json audioClipDataToJson(const AudioClipData& a) {
  Json j = Json::object();
  j["fileReference"] = audioFileRefToJson(a.fileReference);
  j["sourceStartSample"] = a.sourceStartSample;
  j["sourceLengthSamples"] = a.sourceLengthSamples;
  j["pitchShift"] = a.pitchShift;
  j["timeStretch"] = a.timeStretch;
  j["preservePitch"] = a.preservePitch;
  j["warpMarkers"] = Json::array();
  return j;
}

void audioClipDataFromJson(const Json& node, AudioClipData& out) {
  if (!node.is_object()) return;
  if (node.contains("fileReference")) audioFileRefFromJson(node.at("fileReference"), out.fileReference);
  out.sourceStartSample = readInt64(node, "sourceStartSample", 0);
  out.sourceLengthSamples = readInt64(node, "sourceLengthSamples", 0);
  out.pitchShift = static_cast<float>(readDouble(node, "pitchShift", 0.0));
  out.timeStretch = static_cast<float>(readDouble(node, "timeStretch", 1.0));
  out.preservePitch = readBool(node, "preservePitch", true);
}

// --- plugin slots -----------------------------------------------------------

Json pluginSlotToJson(const PluginSlotModel& s) {
  Json j = s.raw.is_object() ? s.raw : Json::object();
  j["id"] = uuidToJson(s.id);
  j["isEnabled"] = s.isEnabled;
  if (!j.contains("parameterValues")) j["parameterValues"] = Json::object();

  if (s.uniqueID.empty() && s.name.empty()) {
    j.erase("pluginID");
  } else {
    Json id = Json::object();
    id["type"] = s.pluginType.empty() ? "vst3Effect" : s.pluginType;
    id["manufacturer"] = s.manufacturer;
    id["name"] = s.name;
    id["uniqueID"] = s.uniqueID;
    j["pluginID"] = std::move(id);
  }
  return j;
}

void pluginSlotFromJson(const Json& node, PluginSlotModel& out) {
  if (!node.is_object()) return;
  out.raw = node;
  if (node.contains("id")) uuidFromJson(node.at("id"), out.id);
  out.isEnabled = readBool(node, "isEnabled", true);
  if (node.contains("pluginID") && node.at("pluginID").is_object()) {
    const Json& p = node.at("pluginID");
    out.pluginType = readString(p, "type");
    out.manufacturer = readString(p, "manufacturer");
    out.name = readString(p, "name");
    out.uniqueID = readString(p, "uniqueID");
  }
}

Json markerToJson(const Marker& m) {
  Json j = Json::object();
  j["id"] = uuidToJson(m.id);
  j["name"] = m.name;
  j["beatPosition"] = m.beatPosition;
  j["color"] = m.color;
  j["type"] = m.type;
  return j;
}

}  // namespace

// ---------------------------------------------------------------------------
// Clip
// ---------------------------------------------------------------------------

Json clipToJson(const Clip& clip) {
  Json j = clip.raw.is_object() ? clip.raw : Json::object();

  j["id"] = wrappedIdToJson(clip.id);
  j["name"] = clip.name;
  j["timeRange"] = timeRangeToJson(clip.timeRange);
  j["fadeInDuration"] = clip.fadeInDuration;
  j["fadeOutDuration"] = clip.fadeOutDuration;
  j["fadeInCurve"] = clip.fadeInCurve;
  j["fadeOutCurve"] = clip.fadeOutCurve;
  j["isLooped"] = clip.isLooped;
  j["isMuted"] = clip.isMuted;
  if (!j.contains("isSelected")) j["isSelected"] = false;

  Json content = Json::object();
  switch (clip.kind) {
    case ClipContentKind::Audio:
      content["audio"] = Json::object({{"_0", audioClipDataToJson(clip.audio)}});
      break;
    case ClipContentKind::Midi:
      content["midi"] = Json::object({{"_0", midiClipDataToJson(clip.midi)}});
      break;
    case ClipContentKind::Empty:
      content["empty"] = Json::object();
      break;
  }
  j["content"] = std::move(content);

  return j;
}

bool clipFromJson(const Json& node, double sampleRate, Clip& out) {
  if (!node.is_object()) return false;
  out.raw = node;

  if (node.contains("id")) uuidFromJson(node.at("id"), out.id);
  out.name = readString(node, "name");
  if (node.contains("timeRange")) timeRangeFromJson(node.at("timeRange"), sampleRate, out.timeRange);
  out.fadeInDuration = readInt64(node, "fadeInDuration", 0);
  out.fadeOutDuration = readInt64(node, "fadeOutDuration", 0);
  out.fadeInCurve = readString(node, "fadeInCurve", "linear");
  out.fadeOutCurve = readString(node, "fadeOutCurve", "linear");
  out.isLooped = readBool(node, "isLooped", false);
  out.isMuted = readBool(node, "isMuted", false);

  out.kind = ClipContentKind::Empty;
  if (node.contains("content")) {
    std::string caseName;
    const Json* payload = nullptr;
    if (readTaggedCase(node.at("content"), caseName, &payload)) {
      if (caseName == "audio") {
        if (const Json* inner = unlabelledPayload(*payload)) {
          out.kind = ClipContentKind::Audio;
          audioClipDataFromJson(*inner, out.audio);
        }
      } else if (caseName == "midi") {
        if (const Json* inner = unlabelledPayload(*payload)) {
          out.kind = ClipContentKind::Midi;
          midiClipDataFromJson(*inner, out.midi);
        }
      }
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Track
// ---------------------------------------------------------------------------

Json trackToJson(const Track& track) {
  Json j = track.raw.is_object() ? track.raw : Json::object();

  j["id"] = wrappedIdToJson(track.id);
  j["name"] = track.name;
  j["type"] = track.type;
  j["color"] = track.color;
  j["volume"] = track.volume;
  j["pan"] = track.pan;
  j["isMuted"] = track.isMuted;
  j["isSolo"] = track.isSolo;
  j["isArmed"] = track.isArmed;
  j["height"] = track.height;
  j["isExpanded"] = track.isExpanded;
  if (!j.contains("isAutomationVisible")) j["isAutomationVisible"] = false;
  if (!j.contains("automationLanes")) j["automationLanes"] = Json::array();

  Json clips = Json::array();
  for (const auto& c : track.clips) clips.push_back(clipToJson(c));
  j["clips"] = std::move(clips);

  Json slots = Json::array();
  for (const auto& s : track.pluginSlots) slots.push_back(pluginSlotToJson(s));
  j["pluginSlots"] = std::move(slots);

  if (track.instrumentSlot.has_value()) {
    j["instrumentSlot"] = pluginSlotToJson(*track.instrumentSlot);
  } else {
    j.erase("instrumentSlot");
  }

  return j;
}

bool trackFromJson(const Json& node, double sampleRate, Track& out) {
  if (!node.is_object()) return false;
  out.raw = node;

  if (node.contains("id")) uuidFromJson(node.at("id"), out.id);
  out.name = readString(node, "name");
  out.type = readString(node, "type", "audio");
  out.color = readString(node, "color", "blue");
  out.volume = static_cast<float>(readDouble(node, "volume", 0.8));
  out.pan = static_cast<float>(readDouble(node, "pan", 0.0));
  out.isMuted = readBool(node, "isMuted", false);
  out.isSolo = readBool(node, "isSolo", false);
  out.isArmed = readBool(node, "isArmed", false);
  out.height = readDouble(node, "height", 80.0);
  out.isExpanded = readBool(node, "isExpanded", true);

  out.clips.clear();
  if (node.contains("clips") && node.at("clips").is_array()) {
    for (const auto& c : node.at("clips")) {
      Clip clip;
      if (clipFromJson(c, sampleRate, clip)) out.clips.push_back(std::move(clip));
    }
  }

  out.pluginSlots.clear();
  if (node.contains("pluginSlots") && node.at("pluginSlots").is_array()) {
    for (const auto& s : node.at("pluginSlots")) {
      PluginSlotModel slot;
      pluginSlotFromJson(s, slot);
      out.pluginSlots.push_back(std::move(slot));
    }
  }

  out.instrumentSlot.reset();
  if (node.contains("instrumentSlot") && node.at("instrumentSlot").is_object()) {
    PluginSlotModel slot;
    pluginSlotFromJson(node.at("instrumentSlot"), slot);
    out.instrumentSlot = std::move(slot);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

LoadResult parseProject(const std::string& jsonText, Project& out) {
  LoadResult result;

  Json root = Json::parse(jsonText, nullptr, /*allow_exceptions=*/false);
  if (root.is_discarded() || !root.is_object()) {
    result.error = "not a JSON object";
    return result;
  }

  Project p;
  p.raw = root;
  p.formatVersion = readInt(root, "formatVersion", 1);
  if (p.formatVersion > Project::kCurrentFormatVersion) result.fromNewerVersion = true;

  if (root.contains("id")) uuidFromJson(root.at("id"), p.id);
  p.name = readString(root, "name", "Untitled");
  p.createdAt = readString(root, "createdAt");
  p.modifiedAt = readString(root, "modifiedAt");
  p.sampleRate = readDouble(root, "sampleRate", 48000.0);

  if (root.contains("tempo")) p.tempo.bpm = readDouble(root.at("tempo"), "bpm", 120.0);
  if (root.contains("timeSignature")) {
    p.timeSignature.numerator = readInt(root.at("timeSignature"), "numerator", 4);
    p.timeSignature.denominator = readInt(root.at("timeSignature"), "denominator", 4);
  }

  p.isLoopEnabled = readBool(root, "isLoopEnabled", false);
  if (root.contains("loopRegion") && root.at("loopRegion").is_object()) {
    TimeRange r;
    if (timeRangeFromJson(root.at("loopRegion"), p.sampleRate, r)) p.loopRegion = r;
  }

  if (root.contains("tracks") && root.at("tracks").is_array()) {
    for (const auto& t : root.at("tracks")) {
      Track track;
      if (trackFromJson(t, p.sampleRate, track)) p.tracks.push_back(std::move(track));
    }
  }

  if (root.contains("masterTrack") && root.at("masterTrack").is_object()) {
    Track master;
    if (trackFromJson(root.at("masterTrack"), p.sampleRate, master)) p.masterTrack = std::move(master);
  }

  if (root.contains("markers") && root.at("markers").is_array()) {
    for (const auto& m : root.at("markers")) {
      if (!m.is_object()) continue;
      Marker marker;
      if (m.contains("id")) uuidFromJson(m.at("id"), marker.id);
      marker.name = readString(m, "name");
      marker.beatPosition = readDouble(m, "beatPosition", 0.0);
      marker.color = readString(m, "color", "blue");
      marker.type = readString(m, "type", "generic");
      p.markers.push_back(std::move(marker));
    }
  }

  if (root.contains("audioFiles") && root.at("audioFiles").is_array()) {
    for (const auto& a : root.at("audioFiles")) {
      AudioFileReference ref;
      audioFileRefFromJson(a, ref);
      p.audioFiles.push_back(std::move(ref));
    }
  }

  p.assignSlots();
  out = std::move(p);
  result.ok = true;
  return result;
}

std::string serialiseProject(const Project& project, bool prettySorted) {
  // Start from the document we parsed so unmodelled sections (vRack, dawState,
  // metadata, automation lanes, tempo maps, plugin state blobs) survive a
  // load/save cycle untouched.
  Json root = project.raw.is_object() ? project.raw : Json::object();

  root["id"] = uuidToJson(project.id);
  root["name"] = project.name;
  root["createdAt"] = project.createdAt;
  root["modifiedAt"] = project.modifiedAt;
  root["sampleRate"] = project.sampleRate;
  root["formatVersion"] = project.formatVersion;
  root["tempo"] = Json::object({{"bpm", project.tempo.bpm}});
  root["timeSignature"] = Json::object({{"numerator", project.timeSignature.numerator},
                                        {"denominator", project.timeSignature.denominator}});
  root["isLoopEnabled"] = project.isLoopEnabled;

  if (project.loopRegion.has_value()) {
    root["loopRegion"] = timeRangeToJson(*project.loopRegion);
  } else {
    root.erase("loopRegion");
  }

  Json tracks = Json::array();
  for (const auto& t : project.tracks) tracks.push_back(trackToJson(t));
  root["tracks"] = std::move(tracks);

  if (project.masterTrack.has_value()) root["masterTrack"] = trackToJson(*project.masterTrack);

  Json markers = Json::array();
  for (const auto& m : project.markers) markers.push_back(markerToJson(m));
  root["markers"] = std::move(markers);

  Json files = Json::array();
  for (const auto& a : project.audioFiles) files.push_back(audioFileRefToJson(a));
  root["audioFiles"] = std::move(files);

  // Sections the engine does not model yet, but that the macOS decoder requires
  // to be present.
  if (!root.contains("tempoChanges")) root["tempoChanges"] = Json::array();
  if (!root.contains("timeSignatureChanges")) root["timeSignatureChanges"] = Json::array();
  if (!root.contains("metadata")) {
    root["metadata"] = Json::object({{"artist", ""}, {"album", ""}, {"genre", ""},
                                     {"comments", ""}, {"copyright", ""}});
  }

  // nlohmann's default object type is a sorted map, so dump() already matches
  // Foundation's .sortedKeys; indent 2 matches .prettyPrinted.
  return prettySorted ? root.dump(2) : root.dump();
}

LoadResult loadProjectFile(const std::string& path, Project& out) {
  LoadResult result;
  std::ifstream in(path, std::ios::binary);
  if (!in) {
    result.error = "cannot open " + path;
    return result;
  }
  std::ostringstream buffer;
  buffer << in.rdbuf();
  return parseProject(buffer.str(), out);
}

bool saveProjectFile(const std::string& path, const Project& project, std::string& error) {
  std::ofstream out(path, std::ios::binary | std::ios::trunc);
  if (!out) {
    error = "cannot write " + path;
    return false;
  }
  out << serialiseProject(project, true);
  if (!out) {
    error = "write failed for " + path;
    return false;
  }
  return true;
}

}  // namespace musio
