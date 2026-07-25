#include "musio/Models.h"

#include <algorithm>
#include <ctime>

namespace musio {

std::string iso8601Now() {
  const std::time_t now = std::time(nullptr);
  std::tm utc{};
#if defined(_WIN32)
  gmtime_s(&utc, &now);
#else
  gmtime_r(&now, &utc);
#endif
  char buf[32];
  // Foundation's .iso8601 strategy writes "yyyy-MM-dd'T'HH:mm:ss'Z'" for UTC.
  std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &utc);
  return std::string(buf);
}

Project Project::makeDefault(const std::string& projectName) {
  Project p;
  p.id = Uuid::random();
  p.name = projectName;
  p.createdAt = iso8601Now();
  p.modifiedAt = p.createdAt;
  p.tempo = Tempo{120.0};
  p.timeSignature = TimeSignature{4, 4};
  p.sampleRate = 48000.0;
  p.formatVersion = kCurrentFormatVersion;

  Track t;
  t.id = Uuid::random();
  t.name = "Audio 1";
  t.type = "audio";
  t.color = "blue";
  t.volume = 0.8f;
  p.tracks.push_back(std::move(t));

  Track master;
  master.id = Uuid::random();
  master.name = "Master";
  master.type = "master";
  master.volume = 1.0f;
  p.masterTrack = std::move(master);

  p.assignSlots();
  return p;
}

Track* Project::findTrack(const Uuid& trackId) noexcept {
  const auto it = std::find_if(tracks.begin(), tracks.end(),
                               [&](const Track& t) { return t.id == trackId; });
  return it == tracks.end() ? nullptr : &*it;
}

Track* Project::findTrackBySlot(TrackSlot slot) noexcept {
  if (slot == kInvalidSlot) return nullptr;
  const auto it = std::find_if(tracks.begin(), tracks.end(),
                               [&](const Track& t) { return t.slot == slot; });
  return it == tracks.end() ? nullptr : &*it;
}

void Project::assignSlots() noexcept {
  TrackSlot next = 0;
  for (auto& t : tracks) {
    t.slot = next++;
    if (next >= static_cast<TrackSlot>(kMaxTracks)) break;
  }
  if (masterTrack.has_value()) masterTrack->slot = kInvalidSlot;  // master is not a mixer slot
}

SampleCount Project::durationInSamples() const noexcept {
  SampleCount maxEnd = 0;
  for (const auto& t : tracks) {
    for (const auto& c : t.clips) {
      maxEnd = std::max(maxEnd, c.timeRange.endSamples());
    }
  }
  return maxEnd;
}

}  // namespace musio
