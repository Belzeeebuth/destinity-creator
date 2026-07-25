// Sample-accurate transport.
//
// The important behaviour here is loop handling. A naive transport checks the
// loop boundary once per audio block and jumps at the block edge, which
// quantises the loop point to the buffer size -- at 512 frames / 48 kHz that is
// up to 10.6 ms of drift, and it is audible. Instead this transport hands the
// caller a sequence of *segments*: the block is split exactly on the loop
// boundary so the wrap lands on the correct sample no matter the buffer size.
//
// Usage from the audio callback:
//
//     int done = 0;
//     while (done < numSamples) {
//       const auto seg = transport.nextSegment(numSamples - done);
//       renderInto(out, done, seg);          // seg.startSample .. +seg.length
//       transport.advance(seg.length);
//       done += seg.length;
//     }
#pragma once

#include "musio/Types.h"

namespace musio {

/// One contiguous run of samples with no timeline discontinuity inside it.
struct BlockSegment {
  SampleCount startSample = 0;  ///< timeline position of the first sample
  int length = 0;               ///< number of samples in this segment
  bool wrapsAtEnd = false;      ///< a loop jump happens immediately after
};

class Transport {
 public:
  void prepare(double sampleRate) noexcept;

  // --- control-thread setters, applied via the command queue ---------------
  void setTempo(double bpm) noexcept;
  void setTimeSignature(int numerator, int denominator) noexcept;
  void setLoop(bool enabled, SampleCount start, SampleCount end) noexcept;

  void play() noexcept;
  void pause() noexcept;
  void stop() noexcept;  ///< stops and returns to the loop/session start
  void seek(SampleCount position) noexcept;

  // --- audio-thread queries ------------------------------------------------
  bool isPlaying() const noexcept { return playing_; }
  SampleCount position() const noexcept { return position_; }
  double sampleRate() const noexcept { return sampleRate_; }
  Tempo tempo() const noexcept { return tempo_; }
  TimeSignature timeSignature() const noexcept { return timeSignature_; }
  bool loopEnabled() const noexcept { return loopEnabled_; }
  SampleCount loopStart() const noexcept { return loopStart_; }
  SampleCount loopEnd() const noexcept { return loopEnd_; }

  /// Longest segment, up to `maxSamples`, that contains no loop discontinuity.
  /// Never returns length 0 for maxSamples > 0.
  BlockSegment nextSegment(int maxSamples) const noexcept;

  /// Advance the play head by `numSamples`, applying a loop wrap if the head
  /// reached the loop end. Call once per segment.
  void advance(int numSamples) noexcept;

  /// Musical position of the play head, for display.
  double positionInBeats() const noexcept {
    const double spb = tempo_.samplesPerBeat(sampleRate_);
    return spb > 0.0 ? static_cast<double>(position_) / spb : 0.0;
  }

 private:
  double sampleRate_ = 48000.0;
  Tempo tempo_{};
  TimeSignature timeSignature_{};

  bool playing_ = false;
  SampleCount position_ = 0;

  bool loopEnabled_ = false;
  SampleCount loopStart_ = 0;
  SampleCount loopEnd_ = 0;

  bool loopIsUsable() const noexcept { return loopEnabled_ && loopEnd_ > loopStart_; }
};

}  // namespace musio
