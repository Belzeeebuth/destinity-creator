#include "musio/ClipPlayer.h"

#include <algorithm>
#include <cmath>

namespace musio {

// ---------------------------------------------------------------------------
// Fade curves
// ---------------------------------------------------------------------------

FadeCurve fadeCurveFromString(const std::string& name) noexcept {
  if (name == "logarithmic") return FadeCurve::Logarithmic;
  if (name == "exponential") return FadeCurve::Exponential;
  if (name == "sCurve") return FadeCurve::SCurve;
  return FadeCurve::Linear;
}

const char* fadeCurveToString(FadeCurve curve) noexcept {
  switch (curve) {
    case FadeCurve::Logarithmic: return "logarithmic";
    case FadeCurve::Exponential: return "exponential";
    case FadeCurve::SCurve: return "sCurve";
    case FadeCurve::Linear: break;
  }
  return "linear";
}

float applyFadeCurve(FadeCurve curve, float t) noexcept {
  const float x = clamp(t, 0.0f, 1.0f);
  switch (curve) {
    // Slow start, steep finish -- the natural shape for a fade-in that should
    // stay quiet for a while.
    case FadeCurve::Exponential: return x * x;
    // Steep start, gentle finish.
    case FadeCurve::Logarithmic: return 1.0f - (1.0f - x) * (1.0f - x);
    // Smoothstep: zero slope at both ends, so butt-joined clips do not click.
    case FadeCurve::SCurve: return x * x * (3.0f - 2.0f * x);
    case FadeCurve::Linear: break;
  }
  return x;
}

// ---------------------------------------------------------------------------
// ClipSceneBuilder
// ---------------------------------------------------------------------------

ClipSceneBuilder::ClipSceneBuilder(std::size_t budgetBytes)
    : scene_(std::make_unique<ClipScene>()), budgetBytes_(budgetBytes) {}

const SampleBuffer* ClipSceneBuilder::adopt(SampleBufferPtr buffer) {
  if (buffer == nullptr) return nullptr;

  const std::size_t bytes = buffer->sizeInBytes();
  if (scene_->audioBytes_ + bytes > budgetBytes_) {
    budgetExceeded_ = true;
    return nullptr;
  }

  scene_->audioBytes_ += bytes;
  scene_->buffers_.push_back(std::move(buffer));
  return scene_->buffers_.back().get();
}

void ClipSceneBuilder::addClip(const ClipRt& clip) {
  // A clip with no audio or no length would just cost the renderer a scan.
  if (clip.source == nullptr || clip.timelineLength <= 0) return;
  scene_->clips_.push_back(clip);
}

ClipScenePtr ClipSceneBuilder::finish() {
  std::sort(scene_->clips_.begin(), scene_->clips_.end(),
            [](const ClipRt& a, const ClipRt& b) {
              return a.timelineStart < b.timelineStart;
            });
  ClipScenePtr finished = std::move(scene_);
  scene_ = std::make_unique<ClipScene>();
  budgetExceeded_ = false;
  return finished;
}

// ---------------------------------------------------------------------------
// Position and envelope maths
// ---------------------------------------------------------------------------

SampleCount clipSourceFrameAt(const ClipRt& clip, SampleCount timelinePosition) noexcept {
  if (clip.source == nullptr) return -1;
  if (timelinePosition < clip.timelineStart) return -1;
  if (timelinePosition >= clip.timelineEnd()) return -1;

  const SampleCount positionInClip = timelinePosition - clip.timelineStart;

  // How much source material this clip is allowed to use.
  SampleCount usable = clip.sourceLength;
  const SampleCount available = clip.source->numFrames() - clip.sourceOffset;
  if (available <= 0) return -1;
  if (usable <= 0 || usable > available) usable = available;

  SampleCount offsetInSource = positionInClip;
  if (clip.looped) {
    offsetInSource = positionInClip % usable;
  } else if (positionInClip >= usable) {
    // Past the end of the material: silence, not a wrap and not a read past the
    // buffer.
    return -1;
  }

  return clip.sourceOffset + offsetInSource;
}

float clipEnvelopeAt(const ClipRt& clip, SampleCount timelinePosition) noexcept {
  if (clip.muted) return 0.0f;
  if (timelinePosition < clip.timelineStart) return 0.0f;
  if (timelinePosition >= clip.timelineEnd()) return 0.0f;

  const SampleCount positionInClip = timelinePosition - clip.timelineStart;
  float envelope = 1.0f;

  if (clip.fadeInFrames > 0 && positionInClip < clip.fadeInFrames) {
    const float t = static_cast<float>(positionInClip) / static_cast<float>(clip.fadeInFrames);
    envelope *= applyFadeCurve(clip.fadeInCurve, t);
  }

  if (clip.fadeOutFrames > 0) {
    const SampleCount fadeOutStart = clip.timelineLength - clip.fadeOutFrames;
    if (positionInClip >= fadeOutStart) {
      const SampleCount into = positionInClip - fadeOutStart;
      const float t = 1.0f - static_cast<float>(into) / static_cast<float>(clip.fadeOutFrames);
      envelope *= applyFadeCurve(clip.fadeOutCurve, t);
    }
  }

  return envelope * clip.gain;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

void renderClipsForTrack(const ClipScene& scene, TrackSlot slot,
                         const BlockSegment& segment, float* left, float* right,
                         int offsetInBlock) noexcept {
  if (segment.length <= 0 || left == nullptr || right == nullptr) return;

  const SampleCount segStart = segment.startSample;
  const SampleCount segEnd = segStart + segment.length;

  const auto& clips = scene.clips();

  for (const ClipRt& clip : clips) {
    // Sorted by start, so once a clip begins at or after the end of this block
    // every later clip does too.
    if (clip.timelineStart >= segEnd) break;

    if (clip.slot != slot) continue;
    if (clip.muted) continue;
    if (!clip.overlaps(segStart, segEnd)) continue;
    if (clip.source == nullptr || clip.source->isEmpty()) continue;

    // Intersect the clip with the block.
    const SampleCount from = std::max(segStart, clip.timelineStart);
    const SampleCount to = std::min(segEnd, clip.timelineEnd());
    if (to <= from) continue;

    const float* srcL = clip.source->channel(0);
    const float* srcR = clip.source->numChannels() > 1 ? clip.source->channel(1) : srcL;
    if (srcL == nullptr) continue;

    const int writeBase = offsetInBlock + static_cast<int>(from - segStart);
    const auto count = static_cast<int>(to - from);

    for (int i = 0; i < count; ++i) {
      const SampleCount timelinePos = from + i;
      const SampleCount srcFrame = clipSourceFrameAt(clip, timelinePos);
      if (srcFrame < 0) continue;  // beyond the material, or outside the clip

      const float envelope = clipEnvelopeAt(clip, timelinePos);
      if (envelope == 0.0f) continue;

      left[writeBase + i] += srcL[srcFrame] * envelope;
      right[writeBase + i] += srcR[srcFrame] * envelope;
    }
  }
}

}  // namespace musio
