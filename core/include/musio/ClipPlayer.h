// Audio clip playback.
//
// A ClipScene is an immutable snapshot of every audio clip in the project,
// together with ownership of the decoded audio they point at. The control thread
// builds one, publishes the pointer, and keeps the previous scene alive until the
// audio thread has demonstrably moved past it (see CoreEngine::publishClipScene).
// The audio thread only ever reads through a raw pointer it loads once per block,
// so there is no refcount, no allocation and no lock on the realtime path.
//
// v1 is memory-resident: clip audio is decoded up front rather than streamed from
// disk. That is a real limit -- documented in ClipSceneBuilder::kDefaultBudgetBytes
// -- but it is honest and it is correct, whereas a half-finished streaming reader
// would be neither. Streaming slots in behind the same ClipRt interface later:
// only the source of the samples changes, not how they are mixed.
#pragma once

#include <string>
#include <vector>

#include "musio/SampleBuffer.h"
#include "musio/Transport.h"
#include "musio/Types.h"

namespace musio {

/// Mirrors DAWCore's FadeCurve cases.
enum class FadeCurve : std::uint32_t { Linear = 0, Logarithmic, Exponential, SCurve };

FadeCurve fadeCurveFromString(const std::string& name) noexcept;
const char* fadeCurveToString(FadeCurve curve) noexcept;

/// Evaluate a fade curve at t in [0, 1]. t=0 is silent, t=1 is unity.
float applyFadeCurve(FadeCurve curve, float t) noexcept;

/// One audio clip, resolved to absolute sample positions and a raw audio pointer.
/// Trivially copyable: it is pure realtime-side data, and the buffer it points at
/// is owned by the enclosing ClipScene.
struct ClipRt {
  const SampleBuffer* source = nullptr;

  TrackSlot slot = kInvalidSlot;

  /// Timeline placement.
  SampleCount timelineStart = 0;
  SampleCount timelineLength = 0;

  /// Which part of the source to play.
  SampleCount sourceOffset = 0;
  SampleCount sourceLength = 0;

  float gain = 1.0f;
  bool looped = false;
  bool muted = false;

  SampleCount fadeInFrames = 0;
  SampleCount fadeOutFrames = 0;
  FadeCurve fadeInCurve = FadeCurve::Linear;
  FadeCurve fadeOutCurve = FadeCurve::Linear;

  SampleCount timelineEnd() const noexcept { return timelineStart + timelineLength; }

  bool overlaps(SampleCount from, SampleCount to) const noexcept {
    return timelineStart < to && timelineEnd() > from;
  }
};

static_assert(std::is_trivially_copyable_v<ClipRt>);

/// Immutable snapshot handed to the audio thread.
class ClipScene {
 public:
  ClipScene() = default;
  ClipScene(const ClipScene&) = delete;
  ClipScene& operator=(const ClipScene&) = delete;

  /// Clips sorted ascending by timelineStart, which lets the renderer stop
  /// scanning once it passes the end of the block.
  const std::vector<ClipRt>& clips() const noexcept { return clips_; }

  std::size_t audioBytes() const noexcept { return audioBytes_; }
  int numBuffers() const noexcept { return static_cast<int>(buffers_.size()); }

 private:
  friend class ClipSceneBuilder;

  std::vector<ClipRt> clips_;
  std::vector<SampleBufferPtr> buffers_;  ///< ownership of everything clips point at
  std::size_t audioBytes_ = 0;
};

using ClipScenePtr = std::unique_ptr<ClipScene>;

/// Control-thread helper for assembling a scene.
class ClipSceneBuilder {
 public:
  /// Default preload budget: 1 GiB of decoded float audio. Past this, adding
  /// buffers fails rather than exhausting memory silently.
  static constexpr std::size_t kDefaultBudgetBytes = 1024ull * 1024ull * 1024ull;

  explicit ClipSceneBuilder(std::size_t budgetBytes = kDefaultBudgetBytes);

  /// Take ownership of decoded audio. Returns a stable pointer to use in
  /// addClip(), or null if the budget is exhausted.
  const SampleBuffer* adopt(SampleBufferPtr buffer);

  void addClip(const ClipRt& clip);

  /// Sorts and returns the finished scene. The builder is empty afterwards.
  ClipScenePtr finish();

  std::size_t audioBytes() const noexcept { return scene_->audioBytes(); }
  bool budgetExceeded() const noexcept { return budgetExceeded_; }

 private:
  ClipScenePtr scene_;
  std::size_t budgetBytes_;
  bool budgetExceeded_ = false;
};

/// Mix every clip on `slot` that overlaps this segment into `left`/`right`,
/// accumulating (never clearing). Realtime-safe: no allocation, no branching on
/// anything unbounded.
///
/// `left`/`right` point at the start of the block; samples land at
/// [offsetInBlock, offsetInBlock + segment.length).
void renderClipsForTrack(const ClipScene& scene, TrackSlot slot,
                         const BlockSegment& segment, float* left, float* right,
                         int offsetInBlock) noexcept;

/// Gain applied to a clip at a given timeline position, from its fades. Exposed
/// for testing -- the renderer computes it inline.
float clipEnvelopeAt(const ClipRt& clip, SampleCount timelinePosition) noexcept;

/// Source frame a clip reads at a given timeline position, honouring looping.
/// Returns -1 when the position is outside the clip or past its source.
SampleCount clipSourceFrameAt(const ClipRt& clip, SampleCount timelinePosition) noexcept;

}  // namespace musio
