// Fundamental value types shared by the realtime engine and the control plane.
//
// Everything here is header-only, trivially copyable where it matters, and
// free of any platform dependency.
#pragma once

#include <array>
#include <cmath>
#include <cstdint>
#include <string>
#include <string_view>

namespace musio {

// Sample positions are always signed 64-bit sample counts, never floating
// seconds. This is the single most important portability/precision decision in
// the engine: the macOS original already did this and it survives unchanged.
using SampleCount = std::int64_t;

/// Dense realtime track index. The audio thread only ever sees these -- never
/// a UUID, never a string. The control plane owns the UUID <-> slot mapping.
using TrackSlot = std::uint32_t;

inline constexpr TrackSlot kInvalidSlot = 0xFFFFFFFFu;
inline constexpr int kMaxTracks = 256;
inline constexpr int kMaxPluginSlotsPerTrack = 8;
inline constexpr int kMaxBlockSize = 8192;

// ---------------------------------------------------------------------------
// UUID
// ---------------------------------------------------------------------------

/// 16-byte UUID with Swift-compatible text form (uppercase, hyphenated).
/// Foundation's JSONEncoder emits uppercase UUID strings, so round-tripping a
/// project written by the macOS app depends on matching that exactly.
struct Uuid {
  std::array<std::uint8_t, 16> bytes{};

  bool isNil() const noexcept;
  std::string toString() const;

  static Uuid random();
  /// Accepts both upper and lower case, with or without surrounding braces.
  static bool parse(std::string_view text, Uuid& out) noexcept;
  static Uuid parseOrNil(std::string_view text) noexcept;

  friend bool operator==(const Uuid& a, const Uuid& b) noexcept { return a.bytes == b.bytes; }
  friend bool operator!=(const Uuid& a, const Uuid& b) noexcept { return !(a == b); }
  friend bool operator<(const Uuid& a, const Uuid& b) noexcept { return a.bytes < b.bytes; }
};

// ---------------------------------------------------------------------------
// Musical time
// ---------------------------------------------------------------------------

struct TimeSignature {
  int numerator = 4;
  int denominator = 4;

  int beatsPerBar() const noexcept { return numerator; }
  /// Length of one notated beat in quarter notes.
  double beatLengthInQuarters() const noexcept { return 4.0 / static_cast<double>(denominator); }
};

struct Tempo {
  double bpm = 120.0;

  double secondsPerBeat() const noexcept { return 60.0 / bpm; }
  double samplesPerBeat(double sampleRate) const noexcept { return sampleRate * 60.0 / bpm; }
};

/// Mirrors DAWCore's TimePosition: a sample count plus the rate it was
/// measured at.
struct TimePosition {
  SampleCount samples = 0;
  double sampleRate = 48000.0;

  double seconds() const noexcept {
    return sampleRate > 0.0 ? static_cast<double>(samples) / sampleRate : 0.0;
  }

  double beats(double bpm) const noexcept { return seconds() * bpm / 60.0; }

  static TimePosition fromBeats(double beats, double bpm, double sampleRate) noexcept {
    const double seconds = (beats / bpm) * 60.0;
    return TimePosition{static_cast<SampleCount>(std::llround(seconds * sampleRate)), sampleRate};
  }

  friend bool operator<(const TimePosition& a, const TimePosition& b) noexcept {
    return a.seconds() < b.seconds();
  }
};

struct TimeRange {
  TimePosition start{};
  TimePosition duration{};

  SampleCount endSamples() const noexcept { return start.samples + duration.samples; }
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

inline float linearToDb(float linear) noexcept {
  return linear > 0.0000001f ? 20.0f * std::log10(linear) : -144.0f;
}

inline float dbToLinear(float db) noexcept {
  return db <= -144.0f ? 0.0f : std::pow(10.0f, db / 20.0f);
}

template <typename T>
constexpr T clamp(T v, T lo, T hi) noexcept {
  return v < lo ? lo : (v > hi ? hi : v);
}

/// Equal-power pan law. pan in [-1, 1] -> (gainL, gainR).
inline void panGains(float pan, float& gainL, float& gainR) noexcept {
  const float p = clamp(pan, -1.0f, 1.0f);
  const float angle = (p + 1.0f) * 0.25f * 3.14159265358979323846f;  // 0 .. pi/2
  gainL = std::cos(angle);
  gainR = std::sin(angle);
}

}  // namespace musio
