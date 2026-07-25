#include "TestFramework.h"
#include "musio/Persistence.h"

#include <fstream>
#include <sstream>

using namespace musio;

namespace {

std::string fixturePath(const char* name) {
  return std::string(MUSIO_FIXTURE_DIR) + "/" + name;
}

std::string readFixture(const char* name) {
  std::ifstream in(fixturePath(name), std::ios::binary);
  if (!in) ::musio::test::fail(MUSIO_AT, std::string("cannot open fixture ") + name);
  std::ostringstream buffer;
  buffer << in.rdbuf();
  return buffer.str();
}

}  // namespace

MUSIO_TEST(uuid, swift_text_form_round_trips) {
  const std::string text = "1A2B3C4D-5E6F-4A7B-8C9D-0E1F2A3B4C5D";
  Uuid id;
  CHECK(Uuid::parse(text, id));
  // Foundation writes uppercase; matching it is what keeps files byte-identical.
  CHECK_STR_EQ(id.toString(), text);

  Uuid lower;
  CHECK(Uuid::parse("1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", lower));
  CHECK(lower == id);

  Uuid braced;
  CHECK(Uuid::parse("{1A2B3C4D-5E6F-4A7B-8C9D-0E1F2A3B4C5D}", braced));
  CHECK(braced == id);
}

MUSIO_TEST(uuid, rejects_malformed_input) {
  Uuid id;
  CHECK(!Uuid::parse("", id));
  CHECK(!Uuid::parse("not-a-uuid", id));
  CHECK(!Uuid::parse("1A2B3C4D-5E6F-4A7B-8C9D", id));               // too short
  CHECK(!Uuid::parse("1A2B3C4D-5E6F-4A7B-8C9D-0E1F2A3B4C5D0", id));  // too long
  CHECK(!Uuid::parse("1A2B3C4D-5E6F-4A7B-8C9D-0E1F2A3B4C5Z", id));   // bad nibble
  CHECK(Uuid{}.isNil());
  CHECK(!Uuid::random().isNil());
}

MUSIO_TEST(persistence, parses_swift_encoded_project) {
  Project p;
  const auto result = parseProject(readFixture("swift_project.json"), p);
  CHECK(result.ok);
  CHECK(!result.fromNewerVersion);

  CHECK_STR_EQ(p.name, "Morning Build");
  CHECK_STR_EQ(p.id.toString(), "1A2B3C4D-5E6F-4A7B-8C9D-0E1F2A3B4C5D");
  CHECK_STR_EQ(p.createdAt, "2026-02-16T09:14:22Z");
  CHECK_NEAR(p.tempo.bpm, 128.0, 1e-9);
  CHECK_EQ(p.timeSignature.numerator, 4);
  CHECK_NEAR(p.sampleRate, 48000.0, 1e-9);
  CHECK_EQ(p.formatVersion, 1);
  CHECK_EQ(static_cast<int>(p.tracks.size()), 2);
  CHECK(p.masterTrack.has_value());
  CHECK_EQ(static_cast<int>(p.markers.size()), 1);
  CHECK_EQ(static_cast<int>(p.audioFiles.size()), 1);

  // Loop region
  CHECK(p.isLoopEnabled);
  CHECK(p.loopRegion.has_value());
  CHECK_EQ(p.loopRegion->start.samples, 48000);
  CHECK_EQ(p.loopRegion->endSamples(), 144000);
}

// TrackID/ClipID are Swift single-property wrapper structs, so they encode as
// {"rawValue": "..."} rather than a bare string. Getting this wrong is the kind
// of mistake that silently produces a file the macOS app refuses to open.
MUSIO_TEST(persistence, wrapped_ids_decode_from_rawValue_objects) {
  Project p;
  CHECK(parseProject(readFixture("swift_project.json"), p).ok);

  const Track& drums = p.tracks[0];
  CHECK_STR_EQ(drums.id.toString(), "0F1E2D3C-4B5A-4698-8776-655443332211");
  CHECK_STR_EQ(drums.clips[0].id.toString(), "11223344-5566-4778-899A-ABBCCDDEEFF0");

  // And a plain UUID property still decodes from a bare string.
  CHECK_STR_EQ(p.markers[0].id.toString(), "4D5E6F7A-8B9C-4D0E-9F1A-2B3C4D5E6F70");

  // Round-trip must re-emit the wrapper shape, not a bare string.
  const Json encoded = trackToJson(drums);
  CHECK(encoded.at("id").is_object());
  CHECK(encoded.at("id").contains("rawValue"));
  CHECK(encoded.at("id").at("rawValue").is_string());
}

MUSIO_TEST(persistence, track_and_mixer_fields_decode) {
  Project p;
  CHECK(parseProject(readFixture("swift_project.json"), p).ok);

  const Track& drums = p.tracks[0];
  CHECK_STR_EQ(drums.name, "Drums");
  CHECK_STR_EQ(drums.type, "instrument");
  CHECK_STR_EQ(drums.color, "red");
  CHECK_NEAR(drums.volume, 0.85, 1e-6);
  CHECK_NEAR(drums.pan, -0.25, 1e-6);
  CHECK(drums.isArmed);
  CHECK(!drums.isMuted);
  CHECK_NEAR(drums.height, 96.0, 1e-9);

  const Track& loop = p.tracks[1];
  CHECK(loop.isMuted);
  CHECK_NEAR(loop.pan, 0.5, 1e-6);
  CHECK_STR_EQ(loop.type, "audio");

  // Realtime slots are assigned densely on load, independent of UUID order.
  CHECK_EQ(static_cast<int>(drums.slot), 0);
  CHECK_EQ(static_cast<int>(loop.slot), 1);
}

MUSIO_TEST(persistence, plugin_slots_decode_without_leaking_format_types) {
  Project p;
  CHECK(parseProject(readFixture("swift_project.json"), p).ok);

  const Track& drums = p.tracks[0];
  CHECK(drums.instrumentSlot.has_value());
  CHECK_STR_EQ(drums.instrumentSlot->name, "Massive X");
  CHECK_STR_EQ(drums.instrumentSlot->manufacturer, "Native Instruments");
  CHECK_STR_EQ(drums.instrumentSlot->pluginType, "audioUnitInstrument");
  CHECK_STR_EQ(drums.instrumentSlot->uniqueID, "-NIMassiveX-1");

  CHECK_EQ(static_cast<int>(drums.pluginSlots.size()), 1);
  CHECK_STR_EQ(drums.pluginSlots[0].name, "Pro-Q 3");
  CHECK_STR_EQ(drums.pluginSlots[0].pluginType, "vst3Effect");
}

// Swift synthesises `case midi(MIDIClipData)` as {"midi": {"_0": {...}}}.
MUSIO_TEST(persistence, swift_enum_payload_encoding_is_reproduced) {
  Project p;
  CHECK(parseProject(readFixture("swift_project.json"), p).ok);

  const Clip& midiClip = p.tracks[0].clips[0];
  CHECK(midiClip.kind == ClipContentKind::Midi);
  CHECK_EQ(static_cast<int>(midiClip.midi.notes.size()), 2);
  CHECK_EQ(static_cast<int>(midiClip.midi.notes[0].pitch), 36);
  CHECK_EQ(static_cast<int>(midiClip.midi.notes[0].velocity), 110);
  CHECK_NEAR(midiClip.midi.notes[0].durationBeats, 0.5, 1e-9);
  CHECK_NEAR(midiClip.midi.notes[1].beatPosition, 1.0, 1e-9);
  CHECK(midiClip.midi.originalTempo.has_value());
  CHECK_NEAR(*midiClip.midi.originalTempo, 128.0, 1e-9);

  const Clip& audioClip = p.tracks[1].clips[0];
  CHECK(audioClip.kind == ClipContentKind::Audio);
  CHECK_EQ(audioClip.audio.sourceStartSample, 1200);
  CHECK_EQ(audioClip.audio.sourceLengthSamples, 240000);
  CHECK_STR_EQ(audioClip.audio.fileReference.relativePath, "Audio Files/break.wav");
  CHECK_EQ(audioClip.audio.fileReference.lengthInSamples, 480000);
  CHECK(audioClip.isLooped);
  CHECK_STR_EQ(audioClip.fadeOutCurve, "linear");
  CHECK_STR_EQ(midiClip.fadeOutCurve, "sCurve");

  // Re-encoding must produce the same nested shape.
  const Json encoded = clipToJson(midiClip);
  CHECK(encoded.at("content").contains("midi"));
  CHECK(encoded.at("content").at("midi").contains("_0"));
  CHECK(encoded.at("content").at("midi").at("_0").contains("events"));

  const Json audioEncoded = clipToJson(audioClip);
  CHECK(audioEncoded.at("content").contains("audio"));
  CHECK(audioEncoded.at("content").at("audio").contains("_0"));
}

// A DAW that drops data on load-then-save is worse than one that cannot open
// the file. vRack, dawState, metadata, automation and CC events are not modelled
// by the engine yet, so they have to survive verbatim.
MUSIO_TEST(persistence, unmodelled_sections_survive_a_round_trip) {
  const std::string original = readFixture("swift_project.json");

  Project p;
  CHECK(parseProject(original, p).ok);
  const std::string written = serialiseProject(p, true);

  const Json before = Json::parse(original);
  const Json after = Json::parse(written);

  CHECK(after.contains("vRack"));
  CHECK(before.at("vRack") == after.at("vRack"));
  CHECK(before.at("dawState") == after.at("dawState"));
  CHECK(before.at("metadata") == after.at("metadata"));

  // Per-track unmodelled fields too.
  CHECK(before.at("tracks")[0].at("automationLanes") ==
        after.at("tracks")[0].at("automationLanes"));
  CHECK(before.at("tracks")[0].at("instrumentSlot").at("parameterValues") ==
        after.at("tracks")[0].at("instrumentSlot").at("parameterValues"));

  // The control-change event the engine does not interpret must still be there.
  const Json& events =
      after.at("tracks")[0].at("clips")[0].at("content").at("midi").at("_0").at("events");
  bool foundCC = false;
  for (const auto& ev : events) {
    if (ev.contains("type") && ev.at("type").contains("controlChange")) {
      foundCC = true;
      CHECK_EQ(ev.at("type").at("controlChange").at("controller").get<int>(), 74);
      CHECK_EQ(ev.at("type").at("controlChange").at("value").get<int>(), 64);
    }
  }
  CHECK(foundCC);
}

MUSIO_TEST(persistence, reparse_is_idempotent) {
  Project first;
  CHECK(parseProject(readFixture("swift_project.json"), first).ok);
  const std::string pass1 = serialiseProject(first, true);

  Project second;
  CHECK(parseProject(pass1, second).ok);
  const std::string pass2 = serialiseProject(second, true);

  // Serialise -> parse -> serialise must be a fixed point.
  CHECK_STR_EQ(pass1, pass2);

  CHECK_STR_EQ(second.name, first.name);
  CHECK_EQ(static_cast<int>(second.tracks.size()), static_cast<int>(first.tracks.size()));
  CHECK_EQ(static_cast<int>(second.tracks[0].clips[0].midi.notes.size()), 2);
}

MUSIO_TEST(persistence, output_is_pretty_printed_with_sorted_keys) {
  Project p = Project::makeDefault("Sorted");
  const std::string text = serialiseProject(p, true);

  // Foundation's [.prettyPrinted, .sortedKeys] -> 2-space indent, keys ascending.
  CHECK(text.find("\n  \"") != std::string::npos);

  const Json parsed = Json::parse(text);
  std::string previous;
  for (auto it = parsed.begin(); it != parsed.end(); ++it) {
    if (!previous.empty()) CHECK(previous < it.key());
    previous = it.key();
  }
}

MUSIO_TEST(persistence, rejects_garbage_without_throwing) {
  Project p;
  CHECK(!parseProject("", p).ok);
  CHECK(!parseProject("{ this is not json", p).ok);
  CHECK(!parseProject("[1,2,3]", p).ok);

  const auto result = parseProject("{}", p);
  CHECK(result.ok);  // an empty object is a valid, empty project
  CHECK_EQ(static_cast<int>(p.tracks.size()), 0);
}

MUSIO_TEST(persistence, flags_projects_from_a_newer_format) {
  Project p;
  const auto result = parseProject("{\"formatVersion\": 99}", p);
  CHECK(result.ok);
  CHECK(result.fromNewerVersion);
}

MUSIO_TEST(persistence, default_project_is_valid_and_serialisable) {
  Project p = Project::makeDefault("Fresh");
  CHECK_STR_EQ(p.name, "Fresh");
  CHECK_EQ(static_cast<int>(p.tracks.size()), 1);
  CHECK(p.masterTrack.has_value());
  CHECK(!p.id.isNil());
  CHECK(!p.createdAt.empty());
  CHECK_EQ(p.formatVersion, Project::kCurrentFormatVersion);

  Project reparsed;
  CHECK(parseProject(serialiseProject(p, true), reparsed).ok);
  CHECK_STR_EQ(reparsed.id.toString(), p.id.toString());
  CHECK_STR_EQ(reparsed.createdAt, p.createdAt);
}

MUSIO_TEST(persistence, project_duration_is_the_last_clip_end) {
  Project p;
  CHECK(parseProject(readFixture("swift_project.json"), p).ok);
  // Break clip: starts at 96000, lasts 240000 -> ends at 336000.
  CHECK_EQ(p.durationInSamples(), 336000);
}

MUSIO_TEST(persistence, iso8601_now_has_the_expected_shape) {
  const std::string now = iso8601Now();
  CHECK_EQ(static_cast<int>(now.size()), 20);
  CHECK_EQ(now[4], '-');
  CHECK_EQ(now[7], '-');
  CHECK_EQ(now[10], 'T');
  CHECK_EQ(now[13], ':');
  CHECK_EQ(now[16], ':');
  CHECK_EQ(now[19], 'Z');
}
