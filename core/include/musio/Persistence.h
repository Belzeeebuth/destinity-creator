// Reading and writing the .musio project format.
//
// The goal is byte-level interoperability with the macOS app's
// ProjectPersistence, which uses Foundation's JSONEncoder configured as:
//
//     encoder.outputFormatting    = [.prettyPrinted, .sortedKeys]
//     encoder.dateEncodingStrategy = .iso8601
//
// Three Swift encoding details have to be reproduced exactly:
//
//   * UUIDs are uppercase hyphenated strings.
//   * A single-property wrapper struct such as `TrackID { let rawValue: UUID }`
//     encodes as a nested object: {"rawValue": "..."} -- not a bare string.
//   * Enums with associated values use Swift's synthesised representation:
//     an unlabelled payload becomes "_0", labelled payloads keep their labels.
//         case midi(MIDIClipData)                  -> {"midi": {"_0": {...}}}
//         case controlChange(controller:value:)    -> {"controlChange":
//                                                       {"controller":1,"value":64}}
//         case empty                               -> {"empty": {}}
//
// Getting any of these wrong produces a file the macOS app rejects, which is
// why there is a round-trip test over a fixture written by the Swift encoder.
#pragma once

#include <string>

#include "musio/Models.h"

namespace musio {

struct LoadResult {
  bool ok = false;
  std::string error;
  /// Set when the file's formatVersion is newer than kCurrentFormatVersion.
  bool fromNewerVersion = false;
};

/// Parse a project from a JSON string.
LoadResult parseProject(const std::string& jsonText, Project& out);

/// Serialise a project. `prettySorted` reproduces Foundation's
/// [.prettyPrinted, .sortedKeys] layout so diffs against files written by the
/// macOS app stay readable.
std::string serialiseProject(const Project& project, bool prettySorted = true);

LoadResult loadProjectFile(const std::string& path, Project& out);
bool saveProjectFile(const std::string& path, const Project& project, std::string& error);

// --- Individual node conversions, exposed for testing -----------------------

Json uuidToJson(const Uuid& id);
Json wrappedIdToJson(const Uuid& id);  ///< {"rawValue": "..."}
bool uuidFromJson(const Json& node, Uuid& out);

Json timePositionToJson(const TimePosition& t);
bool timePositionFromJson(const Json& node, TimePosition& out);

Json clipToJson(const Clip& clip);
bool clipFromJson(const Json& node, double sampleRate, Clip& out);

Json trackToJson(const Track& track);
bool trackFromJson(const Json& node, double sampleRate, Track& out);

}  // namespace musio
