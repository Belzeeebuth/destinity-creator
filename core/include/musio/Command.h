// Commands crossing from the control plane into the audio thread.
//
// A Command is a fixed-size POD tagged record: no std::string, no pointers to
// heap the audio thread would have to free, no virtual dispatch. Anything that
// needs a variable-length payload (a file path, a plugin state blob) is
// prepared on the control thread and handed over as an already-owned handle or
// pre-registered index.
#pragma once

#include <cstdint>
#include <type_traits>

#include "musio/Types.h"

namespace musio {

enum class CommandType : std::uint32_t {
  None = 0,

  // Transport
  Play,
  Stop,
  Pause,
  Seek,            // i64a = target sample
  SetTempo,        // d0 = bpm
  SetTimeSignature,// u32a = numerator, u32b = denominator
  SetLoop,         // u32a = enabled, i64a = start, i64b = end

  // Metronome
  SetMetronomeEnabled,  // u32a = enabled
  SetMetronomeGain,     // d0 = linear gain

  // Mixer
  SetTrackGain,     // u32a = slot, d0 = linear gain
  SetTrackPan,      // u32a = slot, d0 = pan [-1,1]
  SetTrackMute,     // u32a = slot, u32b = muted
  SetTrackSolo,     // u32a = slot, u32b = soloed
  SetTrackActive,   // u32a = slot, u32b = active (slot allocated / freed)
  SetMasterGain,    // d0 = linear gain

  // MIDI
  NoteOn,           // u32a = slot, u32b = note, d0 = velocity [0,1], u32c = channel
  NoteOff,          // u32a = slot, u32b = note, u32c = channel
  AllNotesOff,      // u32a = slot (kInvalidSlot = all)
  ScheduleMidi,     // u32a = slot, i64a = sample pos, u32b = status<<16|d1<<8|d2
  ClearScheduledMidi,

  // Plugins -- the audio thread only ever sees an opaque handle, never a
  // format-specific type. Instantiation happens on the control thread.
  SetPluginBypass,  // u32a = slot, u32b = plugin index, u32c = bypassed
  SwapPluginChain,  // u32a = slot, u64a = prepared chain handle
};

/// 64 bytes, trivially copyable. Verified by static_assert below.
struct Command {
  CommandType type = CommandType::None;
  std::uint32_t u32a = 0;
  std::uint32_t u32b = 0;
  std::uint32_t u32c = 0;
  std::int64_t i64a = 0;
  std::int64_t i64b = 0;
  std::uint64_t u64a = 0;
  double d0 = 0.0;
  double d1 = 0.0;

  static Command make(CommandType t) noexcept {
    Command c;
    c.type = t;
    return c;
  }
};

static_assert(std::is_trivially_copyable_v<Command>);
static_assert(sizeof(Command) <= 64, "keep Command within a cache line");

/// A MIDI event resolved to an absolute sample position on the timeline.
/// Deliberately identical in shape to the macOS original's ScheduledMIDIEvent.
struct ScheduledMidiEvent {
  SampleCount samplePosition = 0;
  TrackSlot slot = kInvalidSlot;
  std::uint8_t status = 0;
  std::uint8_t data1 = 0;
  std::uint8_t data2 = 0;
  std::uint8_t channel = 0;

  static ScheduledMidiEvent noteOn(TrackSlot s, SampleCount pos, std::uint8_t note,
                                   std::uint8_t vel, std::uint8_t ch = 0) noexcept {
    return {pos, s, static_cast<std::uint8_t>(0x90 | (ch & 0x0F)), note, vel, ch};
  }

  static ScheduledMidiEvent noteOff(TrackSlot s, SampleCount pos, std::uint8_t note,
                                    std::uint8_t ch = 0) noexcept {
    return {pos, s, static_cast<std::uint8_t>(0x80 | (ch & 0x0F)), note, 0, ch};
  }

  friend bool operator<(const ScheduledMidiEvent& a, const ScheduledMidiEvent& b) noexcept {
    return a.samplePosition < b.samplePosition;
  }
};

static_assert(std::is_trivially_copyable_v<ScheduledMidiEvent>);

}  // namespace musio
