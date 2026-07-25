#include "musio/CoreEngine.h"

#include <algorithm>
#include <cstdio>
#include <cstring>

#include "musio/Models.h"

namespace musio {

namespace {
constexpr int kClickBusIndex = kMaxTracks;      // scratch slot for the metronome
constexpr int kMasterBusIndex = kMaxTracks + 1; // scratch slot for the master sum
constexpr int kScratchSlots = kMaxTracks + 2;
constexpr int kMaxClicksPerSegment = 64;
constexpr int kMaxCommandsPerBlock = 512;  // bounds the drain loop
}  // namespace

CoreEngine::CoreEngine() : commands_(kCommandQueueCapacity) {
  scheduled_.resize(kMaxScheduledEvents);
}

CoreEngine::~CoreEngine() = default;

void CoreEngine::prepare(double sampleRate, int maxBlockSize) {
  sampleRate_ = sampleRate > 0.0 ? sampleRate : 48000.0;
  maxBlockSize_ = clamp(maxBlockSize, 16, kMaxBlockSize);

  transport_.prepare(sampleRate_);
  metronome_.prepare(sampleRate_);

  // One allocation for every scratch buffer the audio thread will ever use.
  scratch_.assign(static_cast<std::size_t>(kScratchSlots) * 2u *
                      static_cast<std::size_t>(maxBlockSize_),
                  0.0f);

  prepared_ = true;
}

float* CoreEngine::trackBuffer(TrackSlot slot, int channel) noexcept {
  const std::size_t index =
      ((static_cast<std::size_t>(slot) * 2u) + static_cast<std::size_t>(channel)) *
      static_cast<std::size_t>(maxBlockSize_);
  return scratch_.data() + index;
}

float* CoreEngine::clickBuffer(int channel) noexcept {
  return trackBuffer(static_cast<TrackSlot>(kClickBusIndex), channel);
}

float* CoreEngine::masterBuffer(int channel) noexcept {
  return trackBuffer(static_cast<TrackSlot>(kMasterBusIndex), channel);
}

// ---------------------------------------------------------------------------
// Control plane
// ---------------------------------------------------------------------------

bool CoreEngine::post(const Command& command) {
  if (!commands_.push(command)) {
    droppedCommands_.fetch_add(1, std::memory_order_relaxed);
    return false;
  }
  return true;
}

bool CoreEngine::postPlay() { return post(Command::make(CommandType::Play)); }
bool CoreEngine::postStop() { return post(Command::make(CommandType::Stop)); }
bool CoreEngine::postPause() { return post(Command::make(CommandType::Pause)); }

bool CoreEngine::postSeek(SampleCount position) {
  Command c = Command::make(CommandType::Seek);
  c.i64a = position;
  return post(c);
}

bool CoreEngine::postTempo(double bpm) {
  Command c = Command::make(CommandType::SetTempo);
  c.d0 = bpm;
  return post(c);
}

bool CoreEngine::postTimeSignature(int numerator, int denominator) {
  Command c = Command::make(CommandType::SetTimeSignature);
  c.u32a = static_cast<std::uint32_t>(numerator);
  c.u32b = static_cast<std::uint32_t>(denominator);
  return post(c);
}

bool CoreEngine::postLoop(bool enabled, SampleCount start, SampleCount end) {
  Command c = Command::make(CommandType::SetLoop);
  c.u32a = enabled ? 1u : 0u;
  c.i64a = start;
  c.i64b = end;
  return post(c);
}

bool CoreEngine::postMetronome(bool enabled) {
  Command c = Command::make(CommandType::SetMetronomeEnabled);
  c.u32a = enabled ? 1u : 0u;
  return post(c);
}

bool CoreEngine::postMetronomeGain(float gain) {
  Command c = Command::make(CommandType::SetMetronomeGain);
  c.d0 = gain;
  return post(c);
}

bool CoreEngine::postTrackGain(TrackSlot slot, float gain) {
  Command c = Command::make(CommandType::SetTrackGain);
  c.u32a = slot;
  c.d0 = gain;
  return post(c);
}

bool CoreEngine::postTrackPan(TrackSlot slot, float pan) {
  Command c = Command::make(CommandType::SetTrackPan);
  c.u32a = slot;
  c.d0 = pan;
  return post(c);
}

bool CoreEngine::postTrackMute(TrackSlot slot, bool muted) {
  Command c = Command::make(CommandType::SetTrackMute);
  c.u32a = slot;
  c.u32b = muted ? 1u : 0u;
  return post(c);
}

bool CoreEngine::postTrackSolo(TrackSlot slot, bool soloed) {
  Command c = Command::make(CommandType::SetTrackSolo);
  c.u32a = slot;
  c.u32b = soloed ? 1u : 0u;
  return post(c);
}

bool CoreEngine::postTrackActive(TrackSlot slot, bool active) {
  Command c = Command::make(CommandType::SetTrackActive);
  c.u32a = slot;
  c.u32b = active ? 1u : 0u;
  return post(c);
}

bool CoreEngine::postMasterGain(float gain) {
  Command c = Command::make(CommandType::SetMasterGain);
  c.d0 = gain;
  return post(c);
}

bool CoreEngine::postNoteOn(TrackSlot slot, int note, float velocity, int channel) {
  Command c = Command::make(CommandType::NoteOn);
  c.u32a = slot;
  c.u32b = static_cast<std::uint32_t>(clamp(note, 0, 127));
  c.u32c = static_cast<std::uint32_t>(clamp(channel, 0, 15));
  c.d0 = velocity;
  return post(c);
}

bool CoreEngine::postNoteOff(TrackSlot slot, int note, int channel) {
  Command c = Command::make(CommandType::NoteOff);
  c.u32a = slot;
  c.u32b = static_cast<std::uint32_t>(clamp(note, 0, 127));
  c.u32c = static_cast<std::uint32_t>(clamp(channel, 0, 15));
  return post(c);
}

bool CoreEngine::postClearScheduledMidi() {
  return post(Command::make(CommandType::ClearScheduledMidi));
}

bool CoreEngine::postScheduledMidi(const ScheduledMidiEvent& event) {
  Command c = Command::make(CommandType::ScheduleMidi);
  c.u32a = event.slot;
  c.i64a = event.samplePosition;
  c.u32b = (static_cast<std::uint32_t>(event.status) << 16) |
           (static_cast<std::uint32_t>(event.data1) << 8) |
           static_cast<std::uint32_t>(event.data2);
  c.u32c = event.channel;
  return post(c);
}

void CoreEngine::setTrackInstrument(TrackSlot slot, IPluginInstance* instance) {
  if (slot >= static_cast<TrackSlot>(kMaxTracks)) return;
  tracks_[slot].instrument = instance;
}

void CoreEngine::applyProject(Project& project) {
  project.assignSlots();

  transport_.prepare(project.sampleRate > 0.0 ? project.sampleRate : sampleRate_);
  postTempo(project.tempo.bpm);
  postTimeSignature(project.timeSignature.numerator, project.timeSignature.denominator);

  if (project.loopRegion.has_value()) {
    postLoop(project.isLoopEnabled, project.loopRegion->start.samples,
             project.loopRegion->endSamples());
  } else {
    postLoop(false, 0, 0);
  }

  for (TrackSlot s = 0; s < static_cast<TrackSlot>(kMaxTracks); ++s) {
    postTrackActive(s, false);
  }

  for (const auto& track : project.tracks) {
    if (track.slot == kInvalidSlot) continue;
    postTrackActive(track.slot, true);
    postTrackGain(track.slot, track.volume);
    postTrackPan(track.slot, track.pan);
    postTrackMute(track.slot, track.isMuted);
    postTrackSolo(track.slot, track.isSolo);
  }

  if (project.masterTrack.has_value()) postMasterGain(project.masterTrack->volume);

  // Flatten MIDI clips into an absolute, ascending sample schedule.
  postClearScheduledMidi();

  std::vector<ScheduledMidiEvent> events;
  const double spb = project.tempo.samplesPerBeat(
      project.sampleRate > 0.0 ? project.sampleRate : sampleRate_);

  for (const auto& track : project.tracks) {
    if (track.slot == kInvalidSlot) continue;
    for (const auto& clip : track.clips) {
      if (clip.kind != ClipContentKind::Midi) continue;
      for (const auto& note : clip.midi.notes) {
        const SampleCount onset =
            clip.timeRange.start.samples +
            static_cast<SampleCount>(std::llround(note.beatPosition * spb));
        const SampleCount off =
            onset + static_cast<SampleCount>(std::llround(note.durationBeats * spb));
        events.push_back(ScheduledMidiEvent::noteOn(track.slot, onset, note.pitch,
                                                    note.velocity, note.channel));
        events.push_back(
            ScheduledMidiEvent::noteOff(track.slot, off, note.pitch, note.channel));
      }
    }
  }

  std::sort(events.begin(), events.end());
  for (const auto& e : events) {
    if (!postScheduledMidi(e)) break;  // queue full: stop rather than spin
  }
}

// ---------------------------------------------------------------------------
// Audio thread
// ---------------------------------------------------------------------------

void CoreEngine::drainCommands() noexcept {
  Command c;
  int handled = 0;
  while (handled < kMaxCommandsPerBlock && commands_.pop(c)) {
    applyCommand(c);
    ++handled;
  }
}

void CoreEngine::applyCommand(const Command& c) noexcept {
  const TrackSlot slot = c.u32a;
  const bool slotValid = slot < static_cast<TrackSlot>(kMaxTracks);

  switch (c.type) {
    case CommandType::Play: transport_.play(); break;
    case CommandType::Pause: transport_.pause(); break;
    case CommandType::Stop:
      transport_.stop();
      metronome_.reset();
      break;
    case CommandType::Seek: transport_.seek(c.i64a); break;
    case CommandType::SetTempo: transport_.setTempo(c.d0); break;
    case CommandType::SetTimeSignature:
      transport_.setTimeSignature(static_cast<int>(c.u32a), static_cast<int>(c.u32b));
      break;
    case CommandType::SetLoop:
      transport_.setLoop(c.u32a != 0u, c.i64a, c.i64b);
      break;

    case CommandType::SetMetronomeEnabled: metronome_.setEnabled(c.u32a != 0u); break;
    case CommandType::SetMetronomeGain:
      metronome_.setGain(static_cast<float>(c.d0));
      break;

    case CommandType::SetTrackGain:
      if (slotValid) tracks_[slot].gain = clamp(static_cast<float>(c.d0), 0.0f, 4.0f);
      break;
    case CommandType::SetTrackPan:
      if (slotValid) tracks_[slot].pan = clamp(static_cast<float>(c.d0), -1.0f, 1.0f);
      break;
    case CommandType::SetTrackMute:
      if (slotValid) tracks_[slot].muted = c.u32b != 0u;
      break;
    case CommandType::SetTrackSolo:
      if (slotValid) tracks_[slot].soloed = c.u32b != 0u;
      break;
    case CommandType::SetTrackActive:
      if (slotValid) {
        tracks_[slot].active = c.u32b != 0u;
        if (!tracks_[slot].active) {
          tracks_[slot].peak = 0.0f;
          tracks_[slot].rms = 0.0f;
        }
      }
      break;
    case CommandType::SetMasterGain:
      masterGain_ = clamp(static_cast<float>(c.d0), 0.0f, 4.0f);
      break;

    case CommandType::NoteOn:
    case CommandType::NoteOff:
    case CommandType::AllNotesOff:
      // Live MIDI is forwarded straight to the track instrument when one is
      // attached; with no instrument there is nothing to sound yet.
      break;

    case CommandType::ScheduleMidi:
      if (numScheduledEvents_ < kMaxScheduledEvents) {
        ScheduledMidiEvent e;
        e.slot = slot;
        e.samplePosition = c.i64a;
        e.status = static_cast<std::uint8_t>((c.u32b >> 16) & 0xFF);
        e.data1 = static_cast<std::uint8_t>((c.u32b >> 8) & 0xFF);
        e.data2 = static_cast<std::uint8_t>(c.u32b & 0xFF);
        e.channel = static_cast<std::uint8_t>(c.u32c & 0x0F);
        scheduled_[static_cast<std::size_t>(numScheduledEvents_++)] = e;
      }
      break;

    case CommandType::ClearScheduledMidi: numScheduledEvents_ = 0; break;

    case CommandType::SetPluginBypass:
      if (slotValid) {
        const std::uint32_t index = c.u32b;
        if (index < static_cast<std::uint32_t>(tracks_[slot].numEffects)) {
          if (auto* fx = tracks_[slot].effects[index]) fx->setBypassed(c.u32c != 0u);
        }
      }
      break;

    case CommandType::SwapPluginChain:
    case CommandType::None:
    default:
      break;
  }
}

bool CoreEngine::anyTrackSoloed() const noexcept {
  for (int i = 0; i < kMaxTracks; ++i) {
    if (tracks_[i].active && tracks_[i].soloed) return true;
  }
  return false;
}

void CoreEngine::renderMetronome(const BlockSegment& segment, int outOffset) noexcept {
  float* clickL = clickBuffer(0);
  float* clickR = clickBuffer(1);

  if (!metronome_.isEnabled()) {
    // Still let a ringing click decay so disabling mid-tail does not pop.
    if (metronome_.isRinging()) {
      metronome_.renderInto(clickL, clickR, outOffset, segment.length);
    }
    return;
  }

  ClickEvent clicks[kMaxClicksPerSegment];
  const double spb = transport_.tempo().samplesPerBeat(transport_.sampleRate());
  const int numClicks =
      transport_.isPlaying()
          ? findClicksInRange(segment.startSample, segment.length, spb,
                              transport_.timeSignature().beatsPerBar(), clicks,
                              kMaxClicksPerSegment)
          : 0;

  int cursor = 0;
  for (int i = 0; i < numClicks; ++i) {
    const int upTo = clamp(clicks[i].offsetInBlock, 0, segment.length);
    if (upTo > cursor) {
      metronome_.renderInto(clickL, clickR, outOffset + cursor, upTo - cursor);
      cursor = upTo;
    }
    metronome_.trigger(clicks[i].accent);
  }

  if (cursor < segment.length) {
    metronome_.renderInto(clickL, clickR, outOffset + cursor, segment.length - cursor);
  }
}

void CoreEngine::renderSegment(float* const* out, int numChannels, int outOffset,
                               const BlockSegment& segment) noexcept {
  (void)out;
  (void)numChannels;

  const int n = segment.length;
  if (n <= 0) return;

  float* masterL = masterBuffer(0);
  float* masterR = masterBuffer(1);

  // Locate this segment's MIDI window once; the schedule is ascending so a
  // binary search is enough and allocates nothing.
  const ScheduledMidiEvent* midiBegin = nullptr;
  int midiCount = 0;
  if (numScheduledEvents_ > 0 && transport_.isPlaying()) {
    const auto* first = scheduled_.data();
    const auto* last = first + numScheduledEvents_;
    ScheduledMidiEvent probe;
    probe.samplePosition = segment.startSample;
    const auto* lo = std::lower_bound(first, last, probe);
    probe.samplePosition = segment.startSample + n;
    const auto* hi = std::lower_bound(lo, last, probe);
    midiBegin = lo;
    midiCount = static_cast<int>(hi - lo);
  }

  const bool soloActive = anyTrackSoloed();

  for (int i = 0; i < kMaxTracks; ++i) {
    TrackRtState& t = tracks_[static_cast<std::size_t>(i)];
    if (!t.active) continue;

    const bool audible = !t.muted && (!soloActive || t.soloed);

    float* left = trackBuffer(static_cast<TrackSlot>(i), 0);
    float* right = trackBuffer(static_cast<TrackSlot>(i), 1);
    std::memset(left + outOffset, 0, static_cast<std::size_t>(n) * sizeof(float));
    std::memset(right + outOffset, 0, static_cast<std::size_t>(n) * sizeof(float));

    // Instrument: turns this track's MIDI window into audio.
    if (t.instrument != nullptr) {
      float* channels[2] = {left + outOffset, right + outOffset};
      t.instrument->process(channels, 2, n, midiBegin, midiCount, segment.startSample);
    }

    // Insert effects, in place.
    for (int fx = 0; fx < t.numEffects; ++fx) {
      if (auto* effect = t.effects[fx]) {
        float* channels[2] = {left + outOffset, right + outOffset};
        effect->process(channels, 2, n, nullptr, 0, segment.startSample);
      }
    }

    float gainL = 0.0f;
    float gainR = 0.0f;
    panGains(t.pan, gainL, gainR);
    const float g = audible ? t.gain : 0.0f;
    gainL *= g;
    gainR *= g;

    float peak = 0.0f;
    double sumSquares = 0.0;
    for (int s = 0; s < n; ++s) {
      const float l = left[outOffset + s] * gainL;
      const float r = right[outOffset + s] * gainR;
      masterL[outOffset + s] += l;
      masterR[outOffset + s] += r;
      const float mag = std::max(std::fabs(l), std::fabs(r));
      if (mag > peak) peak = mag;
      sumSquares += static_cast<double>(l) * l;
    }

    // Ballistic peak hold, instant attack / slow release.
    t.peak = std::max(peak, t.peak * 0.85f);
    t.rms = static_cast<float>(std::sqrt(sumSquares / static_cast<double>(n)));
  }

  // Metronome sits after the mixer and is not affected by track solo/mute.
  renderMetronome(segment, outOffset);
  const float* clickL = clickBuffer(0);
  const float* clickR = clickBuffer(1);
  for (int s = 0; s < n; ++s) {
    masterL[outOffset + s] += clickL[outOffset + s];
    masterR[outOffset + s] += clickR[outOffset + s];
  }
}

void CoreEngine::process(float* const* out, int numChannels, int numSamples) noexcept {
  if (!prepared_ || out == nullptr || numSamples <= 0) return;

  if (numSamples > maxBlockSize_) {
    // The device handed us a bigger block than we allocated for. Refusing is
    // better than a heap allocation on the audio thread; the backend re-preps
    // when the device buffer size changes.
    xruns_.fetch_add(1, std::memory_order_relaxed);
    for (int ch = 0; ch < numChannels; ++ch) {
      if (out[ch]) std::memset(out[ch], 0, static_cast<std::size_t>(numSamples) * sizeof(float));
    }
    return;
  }

  drainCommands();

  // Clear the master and click busses for this block.
  std::memset(masterBuffer(0), 0, static_cast<std::size_t>(numSamples) * sizeof(float));
  std::memset(masterBuffer(1), 0, static_cast<std::size_t>(numSamples) * sizeof(float));
  std::memset(clickBuffer(0), 0, static_cast<std::size_t>(numSamples) * sizeof(float));
  std::memset(clickBuffer(1), 0, static_cast<std::size_t>(numSamples) * sizeof(float));

  // Split the block on loop boundaries so a loop wrap lands on the exact
  // sample rather than on the next buffer edge.
  int done = 0;
  int guard = 0;
  while (done < numSamples && guard++ < 64) {
    const BlockSegment segment = transport_.nextSegment(numSamples - done);
    if (segment.length <= 0) break;
    renderSegment(out, numChannels, done, segment);
    transport_.advance(segment.length);
    done += segment.length;
  }

  // Master gain, then out to the device.
  const float* mL = masterBuffer(0);
  const float* mR = masterBuffer(1);
  float peakL = 0.0f;
  float peakR = 0.0f;
  double sumL = 0.0;
  double sumR = 0.0;

  for (int s = 0; s < numSamples; ++s) {
    const float l = mL[s] * masterGain_;
    const float r = mR[s] * masterGain_;
    peakL = std::max(peakL, std::fabs(l));
    peakR = std::max(peakR, std::fabs(r));
    sumL += static_cast<double>(l) * l;
    sumR += static_cast<double>(r) * r;

    if (numChannels >= 2) {
      if (out[0]) out[0][s] = l;
      if (out[1]) out[1][s] = r;
    } else if (numChannels == 1 && out[0]) {
      out[0][s] = 0.5f * (l + r);
    }
  }

  for (int ch = 2; ch < numChannels; ++ch) {
    if (out[ch]) std::memset(out[ch], 0, static_cast<std::size_t>(numSamples) * sizeof(float));
  }

  lastPayload_.masterPeakL = peakL;
  lastPayload_.masterPeakR = peakR;
  lastPayload_.masterRmsL = static_cast<float>(std::sqrt(sumL / numSamples));
  lastPayload_.masterRmsR = static_cast<float>(std::sqrt(sumR / numSamples));

  callbackCount_.fetch_add(1, std::memory_order_relaxed);
  publishMeters(numSamples);
}

void CoreEngine::publishMeters(int numSamples) noexcept {
  MeterPayload& p = lastPayload_;

  p.playHeadSamples = transport_.position();
  p.sampleRate = transport_.sampleRate();
  p.tempoBpm = transport_.tempo().bpm;
  p.positionInBeats = transport_.positionInBeats();
  p.isPlaying = transport_.isPlaying() ? 1u : 0u;
  p.loopEnabled = transport_.loopEnabled() ? 1u : 0u;
  p.loopStartSamples = transport_.loopStart();
  p.loopEndSamples = transport_.loopEnd();
  p.bufferSize = static_cast<std::uint32_t>(numSamples);
  p.callbackCount = callbackCount_.load(std::memory_order_relaxed);
  p.xrunCount = xruns_.load(std::memory_order_relaxed);
  p.droppedCommands = static_cast<std::uint32_t>(droppedCommands_.load(std::memory_order_relaxed));

  std::uint32_t highest = 0;
  for (int i = 0; i < kMaxTracks; ++i) {
    p.trackPeak[i] = tracks_[i].peak;
    p.trackRms[i] = tracks_[i].rms;
    if (tracks_[i].active) highest = static_cast<std::uint32_t>(i) + 1u;
  }
  p.trackCount = highest;

  payloadSeq_.fetch_add(1, std::memory_order_release);

  if (meterWriter_ != nullptr) meterWriter_->publish(p);
}

MeterPayload CoreEngine::meterSnapshot() const noexcept { return lastPayload_; }

// ---------------------------------------------------------------------------
// WavWriter
// ---------------------------------------------------------------------------

struct WavWriter::Impl {
  std::FILE* file = nullptr;
  int numChannels = 2;
  double sampleRate = 48000.0;
  Format format = Format::PcmInt16;
  std::uint64_t frames = 0;
  std::vector<std::uint8_t> buffer;
};

namespace {

void put32(std::uint8_t* p, std::uint32_t v) {
  p[0] = static_cast<std::uint8_t>(v & 0xFF);
  p[1] = static_cast<std::uint8_t>((v >> 8) & 0xFF);
  p[2] = static_cast<std::uint8_t>((v >> 16) & 0xFF);
  p[3] = static_cast<std::uint8_t>((v >> 24) & 0xFF);
}

void put16(std::uint8_t* p, std::uint16_t v) {
  p[0] = static_cast<std::uint8_t>(v & 0xFF);
  p[1] = static_cast<std::uint8_t>((v >> 8) & 0xFF);
}

}  // namespace

WavWriter::WavWriter() = default;

WavWriter::~WavWriter() { close(); }

bool WavWriter::open(const std::string& path, double sampleRate, int numChannels,
                     Format format, std::string& error) {
  close();
  impl_ = std::make_unique<Impl>();
  impl_->file = std::fopen(path.c_str(), "wb");
  if (impl_->file == nullptr) {
    error = "cannot open " + path + " for writing";
    impl_.reset();
    return false;
  }
  impl_->numChannels = std::max(1, numChannels);
  impl_->sampleRate = sampleRate;
  impl_->format = format;

  // 44-byte canonical header, patched with real sizes in close().
  std::uint8_t header[44]{};
  std::memcpy(header, "RIFF", 4);
  std::memcpy(header + 8, "WAVE", 4);
  std::memcpy(header + 12, "fmt ", 4);
  put32(header + 16, 16);
  const bool isFloat = format == Format::Float32;
  put16(header + 20, isFloat ? 3 : 1);  // 3 = IEEE float, 1 = PCM
  put16(header + 22, static_cast<std::uint16_t>(impl_->numChannels));
  put32(header + 24, static_cast<std::uint32_t>(sampleRate));
  const int bytesPerSample = isFloat ? 4 : 2;
  const std::uint32_t byteRate =
      static_cast<std::uint32_t>(sampleRate) *
      static_cast<std::uint32_t>(impl_->numChannels * bytesPerSample);
  put32(header + 28, byteRate);
  put16(header + 32, static_cast<std::uint16_t>(impl_->numChannels * bytesPerSample));
  put16(header + 34, static_cast<std::uint16_t>(bytesPerSample * 8));
  std::memcpy(header + 36, "data", 4);

  if (std::fwrite(header, 1, sizeof(header), impl_->file) != sizeof(header)) {
    error = "failed to write WAV header";
    close();
    return false;
  }
  framesWritten_ = 0;
  return true;
}

bool WavWriter::write(const float* const* channels, int numChannels, int numSamples) {
  if (!impl_ || impl_->file == nullptr || numSamples <= 0) return false;

  const int nch = impl_->numChannels;
  const bool isFloat = impl_->format == Format::Float32;
  const int bytesPerSample = isFloat ? 4 : 2;
  impl_->buffer.resize(static_cast<std::size_t>(numSamples) * nch * bytesPerSample);

  std::uint8_t* dst = impl_->buffer.data();
  for (int s = 0; s < numSamples; ++s) {
    for (int ch = 0; ch < nch; ++ch) {
      const float v = (ch < numChannels && channels[ch] != nullptr) ? channels[ch][s] : 0.0f;
      if (isFloat) {
        std::uint32_t bits;
        std::memcpy(&bits, &v, 4);
        put32(dst, bits);
      } else {
        const float c = clamp(v, -1.0f, 1.0f);
        put16(dst, static_cast<std::uint16_t>(static_cast<std::int16_t>(std::lround(c * 32767.0f))));
      }
      dst += bytesPerSample;
    }
  }

  if (std::fwrite(impl_->buffer.data(), 1, impl_->buffer.size(), impl_->file) !=
      impl_->buffer.size()) {
    return false;
  }
  impl_->frames += static_cast<std::uint64_t>(numSamples);
  framesWritten_ = impl_->frames;
  return true;
}

bool WavWriter::close() {
  if (!impl_) return true;
  bool ok = true;

  if (impl_->file != nullptr) {
    const bool isFloat = impl_->format == Format::Float32;
    const int bytesPerSample = isFloat ? 4 : 2;
    const std::uint32_t dataBytes = static_cast<std::uint32_t>(
        impl_->frames * static_cast<std::uint64_t>(impl_->numChannels * bytesPerSample));

    std::uint8_t patch[4];
    ok = std::fseek(impl_->file, 4, SEEK_SET) == 0;
    put32(patch, 36 + dataBytes);
    ok = ok && std::fwrite(patch, 1, 4, impl_->file) == 4;
    ok = ok && std::fseek(impl_->file, 40, SEEK_SET) == 0;
    put32(patch, dataBytes);
    ok = ok && std::fwrite(patch, 1, 4, impl_->file) == 4;

    std::fclose(impl_->file);
    impl_->file = nullptr;
  }

  impl_.reset();
  return ok;
}

}  // namespace musio
