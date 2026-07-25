#include "musio/Transport.h"

#include <algorithm>

namespace musio {

void Transport::prepare(double sampleRate) noexcept {
  if (sampleRate > 0.0) sampleRate_ = sampleRate;
}

void Transport::setTempo(double bpm) noexcept {
  tempo_.bpm = clamp(bpm, 20.0, 999.0);
}

void Transport::setTimeSignature(int numerator, int denominator) noexcept {
  if (numerator > 0) timeSignature_.numerator = numerator;
  if (denominator > 0) timeSignature_.denominator = denominator;
}

void Transport::setLoop(bool enabled, SampleCount start, SampleCount end) noexcept {
  loopEnabled_ = enabled;
  loopStart_ = std::max<SampleCount>(0, start);
  loopEnd_ = std::max<SampleCount>(loopStart_, end);
}

void Transport::play() noexcept { playing_ = true; }

void Transport::pause() noexcept { playing_ = false; }

void Transport::stop() noexcept {
  playing_ = false;
  position_ = loopIsUsable() ? loopStart_ : 0;
}

void Transport::seek(SampleCount position) noexcept {
  position_ = std::max<SampleCount>(0, position);
}

BlockSegment Transport::nextSegment(int maxSamples) const noexcept {
  BlockSegment seg;
  seg.startSample = position_;
  seg.length = std::max(0, maxSamples);
  seg.wrapsAtEnd = false;

  if (!playing_ || seg.length == 0) return seg;

  // Only clip the segment when the play head is inside the loop region and the
  // loop end falls within this block. A head positioned before loopStart is
  // allowed to run freely into the loop.
  if (loopIsUsable() && position_ >= loopStart_ && position_ < loopEnd_) {
    const SampleCount untilLoopEnd = loopEnd_ - position_;
    if (untilLoopEnd < static_cast<SampleCount>(seg.length)) {
      seg.length = static_cast<int>(untilLoopEnd);
      seg.wrapsAtEnd = true;
    }
  }

  return seg;
}

void Transport::advance(int numSamples) noexcept {
  if (!playing_ || numSamples <= 0) return;

  position_ += numSamples;

  if (!loopIsUsable()) return;

  if (position_ >= loopEnd_) {
    const SampleCount loopLength = loopEnd_ - loopStart_;
    const SampleCount overshoot = position_ - loopEnd_;
    // Segmenting normally makes overshoot exactly 0. The modulo is here so a
    // caller that ignores nextSegment() still lands somewhere musically sane
    // instead of running away past the loop.
    position_ = loopStart_ + (loopLength > 0 ? overshoot % loopLength : 0);
  }
}

}  // namespace musio
