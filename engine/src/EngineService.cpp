#include "EngineService.h"

#include <algorithm>
#include <cmath>
#include <map>
#include <vector>

#include "musio/Persistence.h"

namespace musio {

namespace {

double numberOr(const Json& params, const char* key, double fallback) {
  if (!params.is_object() || !params.contains(key)) return fallback;
  const Json& v = params.at(key);
  return v.is_number() ? v.get<double>() : fallback;
}

std::int64_t intOr(const Json& params, const char* key, std::int64_t fallback) {
  if (!params.is_object() || !params.contains(key)) return fallback;
  const Json& v = params.at(key);
  return v.is_number() ? v.get<std::int64_t>() : fallback;
}

bool boolOr(const Json& params, const char* key, bool fallback) {
  if (!params.is_object() || !params.contains(key)) return fallback;
  const Json& v = params.at(key);
  return v.is_boolean() ? v.get<bool>() : fallback;
}

std::string stringOr(const Json& params, const char* key, const std::string& fallback = {}) {
  if (!params.is_object() || !params.contains(key)) return fallback;
  const Json& v = params.at(key);
  return v.is_string() ? v.get<std::string>() : fallback;
}

Json ok() { return Json::object({{"ok", true}}); }

}  // namespace

EngineService::EngineService() : audio_(engine_) {
  project_ = Project::makeDefault("Untitled");
  engine_.prepare(48000.0, 1024);
  engine_.applyProject(project_);
}

EngineService::~EngineService() { stop(); }

Json EngineService::fail(const std::string& message) {
  return Json::object({{"__error", message}});
}

bool EngineService::openAudio(const AudioBackend::Options& options, std::string& error) {
  if (!audio_.open(options, error)) return false;
  engine_.applyProject(project_);
  return true;
}

bool EngineService::startTelemetry(const std::string& shmName, std::string& error) {
  if (!meters_.open(shmName, error)) return false;
  shmName_ = meters_.name();
  engine_.setMeterWriter(&meters_);
  return true;
}

bool EngineService::startRpc(const std::string& socketPath, std::string& error) {
  return rpc_.start(
      socketPath,
      [this](const std::string& method, const Json& params) {
        return dispatch(method, params);
      },
      error);
}

void EngineService::stop() {
  rpc_.stop();
  audio_.close();
  engine_.setMeterWriter(nullptr);
  meters_.close();
}

const EngineService::ClipLoadReport& EngineService::rebuildClipScene(double targetSampleRate) {
  clipReport_ = ClipLoadReport{};

  if (targetSampleRate <= 0.0) targetSampleRate = project_.sampleRate;

  ClipSceneBuilder builder;

  // One decode per file, however many clips reference it. The fixture project
  // reuses a single break across clips, and a real project does this constantly.
  std::map<std::string, const SampleBuffer*> byPath;

  for (const auto& track : project_.tracks) {
    if (track.slot == kInvalidSlot) continue;

    for (const auto& clip : track.clips) {
      if (clip.kind != ClipContentKind::Audio) continue;

      const auto& reference = clip.audio.fileReference;
      const std::string resolved = resolveAudioFilePath(
          projectPath_, reference.relativePath, reference.originalPath);

      if (resolved.empty()) {
        ++clipReport_.filesMissing;
        clipReport_.problems.push_back(
            "missing audio for clip '" + clip.name + "': tried '" +
            reference.relativePath + "' and '" + reference.originalPath + "'");
        continue;
      }

      const SampleBuffer* buffer = nullptr;
      const auto cached = byPath.find(resolved);

      if (cached != byPath.end()) {
        buffer = cached->second;
      } else {
        std::string error;
        AudioFileCache::LoadInfo info;
        SampleBufferPtr decoded =
            audioFiles_.load(resolved, targetSampleRate, error, &info);

        if (decoded == nullptr) {
          ++clipReport_.filesMissing;
          clipReport_.problems.push_back("clip '" + clip.name + "': " + error);
          byPath.emplace(resolved, nullptr);
          continue;
        }

        if (info.resampled) ++clipReport_.filesResampled;

        buffer = builder.adopt(std::move(decoded));
        if (buffer == nullptr) {
          clipReport_.budgetExceeded = true;
          clipReport_.problems.push_back(
              "preload budget exhausted before '" + clip.name + "'");
          byPath.emplace(resolved, nullptr);
          continue;
        }

        ++clipReport_.filesLoaded;
        byPath.emplace(resolved, buffer);
      }

      if (buffer == nullptr) continue;  // a previous attempt on this file failed

      ClipRt rt;
      rt.source = buffer;
      rt.slot = track.slot;
      rt.timelineStart = clip.timeRange.start.samples;
      rt.timelineLength = clip.timeRange.duration.samples;
      rt.sourceOffset = clip.audio.sourceStartSample;
      rt.sourceLength = clip.audio.sourceLengthSamples;
      rt.looped = clip.isLooped;
      rt.muted = clip.isMuted;
      rt.gain = 1.0f;  // track volume is applied by the mixer, not per clip
      rt.fadeInFrames = clip.fadeInDuration;
      rt.fadeOutFrames = clip.fadeOutDuration;
      rt.fadeInCurve = fadeCurveFromString(clip.fadeInCurve);
      rt.fadeOutCurve = fadeCurveFromString(clip.fadeOutCurve);

      // A clip whose timeline length is unset falls back to its source length, so
      // a hand-written project file does not silently produce nothing.
      if (rt.timelineLength <= 0) {
        rt.timelineLength = rt.sourceLength > 0 ? rt.sourceLength : buffer->numFrames();
      }

      builder.addClip(rt);
      ++clipReport_.clipsPlaced;
    }
  }

  clipReport_.audioBytes = builder.audioBytes();
  if (builder.budgetExceeded()) clipReport_.budgetExceeded = true;

  engine_.publishClipScene(builder.finish());
  return clipReport_;
}

Json EngineService::clipReportToJson() const {
  Json report = Json::object();
  report["clipsPlaced"] = clipReport_.clipsPlaced;
  report["filesLoaded"] = clipReport_.filesLoaded;
  report["filesMissing"] = clipReport_.filesMissing;
  report["filesResampled"] = clipReport_.filesResampled;
  report["audioBytes"] = static_cast<std::uint64_t>(clipReport_.audioBytes);
  report["budgetExceeded"] = clipReport_.budgetExceeded;
  report["problems"] = clipReport_.problems;
  return report;
}

bool EngineService::renderToFile(const std::string& path, SampleCount numSamples,
                                double sampleRate, int blockSize, std::string& error) {
  blockSize = clamp(blockSize, 32, kMaxBlockSize);

  WavWriter writer;
  if (!writer.open(path, sampleRate, 2, WavWriter::Format::PcmInt16, error)) return false;

  engine_.prepare(sampleRate, blockSize);
  engine_.applyProject(project_);
  // Clip audio has to be decoded at the render rate, which may differ from the
  // rate it was decoded at when the project was loaded.
  rebuildClipScene(sampleRate);

  std::vector<float> left(static_cast<std::size_t>(blockSize), 0.0f);
  std::vector<float> right(static_cast<std::size_t>(blockSize), 0.0f);
  float* channels[2] = {left.data(), right.data()};

  // Let the queued applyProject() commands land before the transport rolls.
  for (int i = 0; i < 8; ++i) engine_.process(channels, 2, blockSize);

  engine_.postPlay();

  SampleCount written = 0;
  while (written < numSamples) {
    const int n = static_cast<int>(
        std::min<SampleCount>(blockSize, numSamples - written));
    engine_.process(channels, 2, n);
    if (!writer.write(channels, 2, n)) {
      error = "failed writing audio data to " + path;
      writer.close();
      return false;
    }
    written += n;
  }

  engine_.postStop();
  return writer.close();
}

// ---------------------------------------------------------------------------
// RPC dispatch
// ---------------------------------------------------------------------------

Json EngineService::dispatch(const std::string& method, const Json& params) {
  const std::lock_guard<std::mutex> lock(controlMutex_);

  // --- engine ------------------------------------------------------------
  if (method == "engine.status") {
    const MeterPayload p = engine_.meterSnapshot();
    Json status = Json::object();
    status["audioOpen"] = audio_.isOpen();
    status["backend"] = audio_.currentBackendName();
    status["device"] = audio_.currentDeviceName();
    status["sampleRate"] = audio_.isOpen() ? audio_.currentSampleRate() : p.sampleRate;
    status["bufferSize"] = audio_.currentBufferSize();
    status["cpuLoad"] = audio_.cpuLoad();
    status["underruns"] = audio_.underrunCount();
    status["isPlaying"] = p.isPlaying != 0u;
    status["playHeadSamples"] = p.playHeadSamples;
    status["positionInBeats"] = p.positionInBeats;
    status["tempoBpm"] = p.tempoBpm;
    status["droppedCommands"] = engine_.droppedCommandCount();
    status["callbacks"] = engine_.callbackCount();
    status["telemetryShm"] = shmName_;
    status["pluginFormats"] = JucePluginHost::supportedFormats();
    status["knownPlugins"] = plugins_.numKnownPlugins();
    status["scheduledMidiEvents"] = engine_.scheduledMidiCount();
    return status;
  }

  if (method == "engine.shutdown") {
    shutdownRequested_.store(true, std::memory_order_release);
    return ok();
  }

  // --- audio device ------------------------------------------------------
  if (method == "audio.listDevices") {
    Json devices = Json::array();
    for (const auto& d : AudioBackend::enumerateDevices()) {
      Json entry = Json::object();
      entry["backend"] = d.backend;
      entry["name"] = d.name;
      entry["isDefault"] = d.isDefault;
      entry["sampleRates"] = d.sampleRates;
      entry["bufferSizes"] = d.bufferSizes;
      entry["outputChannels"] = d.outputChannels;
      entry["inputChannels"] = d.inputChannels;
      devices.push_back(std::move(entry));
    }
    return Json::object({{"devices", std::move(devices)}});
  }

  if (method == "audio.open") {
    AudioBackend::Options options;
    options.backend = stringOr(params, "backend");
    options.deviceName = stringOr(params, "device");
    options.sampleRate = numberOr(params, "sampleRate", 48000.0);
    options.bufferSize = static_cast<int>(intOr(params, "bufferSize", 512));
    options.outputChannels = static_cast<int>(intOr(params, "outputChannels", 2));
    options.inputChannels = static_cast<int>(intOr(params, "inputChannels", 0));

    std::string error;
    if (!openAudio(options, error)) return fail(error);

    return Json::object({{"ok", true},
                         {"backend", audio_.currentBackendName()},
                         {"device", audio_.currentDeviceName()},
                         {"sampleRate", audio_.currentSampleRate()},
                         {"bufferSize", audio_.currentBufferSize()}});
  }

  if (method == "audio.close") {
    audio_.close();
    return ok();
  }

  // --- transport ---------------------------------------------------------
  if (method == "transport.play") return engine_.postPlay() ? ok() : fail("queue full");
  if (method == "transport.pause") return engine_.postPause() ? ok() : fail("queue full");
  if (method == "transport.stop") return engine_.postStop() ? ok() : fail("queue full");

  if (method == "transport.seek") {
    SampleCount target = 0;
    if (params.contains("beats")) {
      const double spb = project_.tempo.samplesPerBeat(project_.sampleRate);
      target = static_cast<SampleCount>(std::llround(numberOr(params, "beats", 0.0) * spb));
    } else {
      target = intOr(params, "samples", 0);
    }
    return engine_.postSeek(target) ? ok() : fail("queue full");
  }

  if (method == "transport.setTempo") {
    const double bpm = numberOr(params, "bpm", 120.0);
    if (bpm < 20.0 || bpm > 999.0) return fail("bpm out of range (20-999)");
    project_.tempo.bpm = bpm;
    return engine_.postTempo(bpm) ? ok() : fail("queue full");
  }

  if (method == "transport.setTimeSignature") {
    const int num = static_cast<int>(intOr(params, "numerator", 4));
    const int den = static_cast<int>(intOr(params, "denominator", 4));
    if (num <= 0 || den <= 0) return fail("time signature must be positive");
    project_.timeSignature = TimeSignature{num, den};
    return engine_.postTimeSignature(num, den) ? ok() : fail("queue full");
  }

  if (method == "transport.setLoop") {
    const bool enabled = boolOr(params, "enabled", false);
    const SampleCount start = intOr(params, "startSamples", 0);
    const SampleCount end = intOr(params, "endSamples", 0);
    if (enabled && end <= start) return fail("loop end must be after loop start");
    project_.isLoopEnabled = enabled;
    TimeRange range;
    range.start = TimePosition{start, project_.sampleRate};
    range.duration = TimePosition{end - start, project_.sampleRate};
    project_.loopRegion = range;
    return engine_.postLoop(enabled, start, end) ? ok() : fail("queue full");
  }

  // --- metronome ---------------------------------------------------------
  if (method == "metronome.set") {
    bool queued = true;
    if (params.contains("enabled")) {
      queued = engine_.postMetronome(boolOr(params, "enabled", false)) && queued;
    }
    if (params.contains("gain")) {
      queued = engine_.postMetronomeGain(
                   static_cast<float>(numberOr(params, "gain", 0.5))) && queued;
    }
    return queued ? ok() : fail("queue full");
  }

  // --- mixer -------------------------------------------------------------
  if (method == "mixer.setTrack") {
    const auto slot = static_cast<TrackSlot>(intOr(params, "slot", -1));
    if (slot >= static_cast<TrackSlot>(kMaxTracks)) return fail("slot out of range");

    Track* track = project_.findTrackBySlot(slot);
    bool queued = true;

    if (params.contains("gain")) {
      const auto gain = static_cast<float>(numberOr(params, "gain", 0.8));
      if (track != nullptr) track->volume = gain;
      queued = engine_.postTrackGain(slot, gain) && queued;
    }
    if (params.contains("pan")) {
      const auto pan = static_cast<float>(numberOr(params, "pan", 0.0));
      if (track != nullptr) track->pan = pan;
      queued = engine_.postTrackPan(slot, pan) && queued;
    }
    if (params.contains("muted")) {
      const bool muted = boolOr(params, "muted", false);
      if (track != nullptr) track->isMuted = muted;
      queued = engine_.postTrackMute(slot, muted) && queued;
    }
    if (params.contains("soloed")) {
      const bool soloed = boolOr(params, "soloed", false);
      if (track != nullptr) track->isSolo = soloed;
      queued = engine_.postTrackSolo(slot, soloed) && queued;
    }
    return queued ? ok() : fail("queue full");
  }

  if (method == "mixer.setMasterGain") {
    const auto gain = static_cast<float>(numberOr(params, "gain", 1.0));
    if (project_.masterTrack.has_value()) project_.masterTrack->volume = gain;
    return engine_.postMasterGain(gain) ? ok() : fail("queue full");
  }

  // --- project -----------------------------------------------------------
  if (method == "project.new") {
    project_ = Project::makeDefault(stringOr(params, "name", "Untitled"));
    projectPath_.clear();
    engine_.applyProject(project_);
    rebuildClipScene(audio_.isOpen() ? audio_.currentSampleRate() : project_.sampleRate);
    return dispatch_projectInfo();
  }

  if (method == "project.load") {
    const std::string path = stringOr(params, "path");
    if (path.empty()) return fail("missing 'path'");

    Project loaded;
    const LoadResult result = loadProjectFile(path, loaded);
    if (!result.ok) return fail(result.error);

    project_ = std::move(loaded);
    projectPath_ = path;
    engine_.applyProject(project_);
    rebuildClipScene(audio_.isOpen() ? audio_.currentSampleRate() : project_.sampleRate);

    Json info = dispatch_projectInfo();
    info["fromNewerFormatVersion"] = result.fromNewerVersion;
    return info;
  }

  if (method == "project.save") {
    const std::string path = stringOr(params, "path", projectPath_);
    if (path.empty()) return fail("no path given and no project loaded from disk");

    project_.modifiedAt = iso8601Now();
    std::string error;
    if (!saveProjectFile(path, project_, error)) return fail(error);
    projectPath_ = path;
    return Json::object({{"ok", true}, {"path", path}});
  }

  if (method == "project.info") return dispatch_projectInfo();

  // --- plugins -----------------------------------------------------------
  if (method == "plugins.scan") {
    if (params.contains("paths") && params.at("paths").is_array()) {
      std::vector<std::string> paths;
      for (const auto& p : params.at("paths")) {
        if (p.is_string()) paths.push_back(p.get<std::string>());
      }
      if (!paths.empty()) plugins_.setSearchPaths(paths);
    }

    const int found = plugins_.scan(boolOr(params, "rescanAll", false));
    Json result = Json::object();
    result["found"] = found;
    result["formats"] = JucePluginHost::supportedFormats();
    if (!plugins_.lastScanError().empty()) result["warning"] = plugins_.lastScanError();
    return result;
  }

  if (method == "plugins.list") {
    Json list = Json::array();
    for (int i = 0; i < plugins_.numKnownPlugins(); ++i) {
      PluginDescriptor d;
      if (!plugins_.describePlugin(i, d)) continue;
      Json entry = Json::object();
      entry["uid"] = d.uid;
      entry["name"] = d.name;
      entry["vendor"] = d.vendor;
      entry["path"] = d.path;
      entry["format"] = d.format == PluginFormat::VST3   ? "VST3"
                        : d.format == PluginFormat::LV2  ? "LV2"
                        : d.format == PluginFormat::CLAP ? "CLAP"
                                                         : "Unknown";
      entry["kind"] = d.kind == PluginKind::Instrument ? "instrument" : "effect";
      entry["inputs"] = d.numInputChannels;
      entry["outputs"] = d.numOutputChannels;
      list.push_back(std::move(entry));
    }
    return Json::object({{"plugins", std::move(list)}});
  }

  // --- telemetry ---------------------------------------------------------
  if (method == "meters.info") {
    return Json::object({{"shmName", shmName_},
                         {"payloadBytes", static_cast<std::uint64_t>(sizeof(MeterPayload))},
                         {"maxTracks", kMaxTracks}});
  }

  return fail("unknown method '" + method + "'");
}

Json EngineService::dispatch_projectInfo() {
  Json info = Json::object();
  info["id"] = project_.id.toString();
  info["name"] = project_.name;
  info["path"] = projectPath_;
  info["tempoBpm"] = project_.tempo.bpm;
  info["timeSignature"] = Json::object({{"numerator", project_.timeSignature.numerator},
                                        {"denominator", project_.timeSignature.denominator}});
  info["sampleRate"] = project_.sampleRate;
  info["formatVersion"] = project_.formatVersion;
  info["durationSamples"] = project_.durationInSamples();
  info["isLoopEnabled"] = project_.isLoopEnabled;
  if (project_.loopRegion.has_value()) {
    info["loopStartSamples"] = project_.loopRegion->start.samples;
    info["loopEndSamples"] = project_.loopRegion->endSamples();
  }

  Json tracks = Json::array();
  for (const auto& t : project_.tracks) {
    Json entry = Json::object();
    entry["slot"] = t.slot;
    entry["id"] = t.id.toString();
    entry["name"] = t.name;
    entry["type"] = t.type;
    entry["color"] = t.color;
    entry["volume"] = t.volume;
    entry["pan"] = t.pan;
    entry["muted"] = t.isMuted;
    entry["soloed"] = t.isSolo;
    entry["armed"] = t.isArmed;
    entry["clips"] = t.clips.size();

    int midiNotes = 0;
    for (const auto& c : t.clips) midiNotes += static_cast<int>(c.midi.notes.size());
    entry["midiNotes"] = midiNotes;

    if (t.instrumentSlot.has_value()) {
      entry["instrument"] = Json::object({{"name", t.instrumentSlot->name},
                                          {"vendor", t.instrumentSlot->manufacturer},
                                          {"type", t.instrumentSlot->pluginType},
                                          {"uid", t.instrumentSlot->uniqueID}});
    }
    tracks.push_back(std::move(entry));
  }
  info["tracks"] = std::move(tracks);

  if (project_.masterTrack.has_value()) {
    info["masterVolume"] = project_.masterTrack->volume;
  }

  info["clips"] = clipReportToJson();

  return info;
}

}  // namespace musio
