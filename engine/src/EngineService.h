// Ties the pieces together and exposes them as RPC methods.
//
// Everything here runs on the control thread. It reaches the audio thread only
// through CoreEngine's lock-free command queue, so no RPC call can ever block
// the audio callback -- which is the whole reason the split exists.
#pragma once

#include <memory>
#include <mutex>
#include <string>

#include "AudioBackend.h"
#include "PluginHost.h"
#include "RpcServer.h"
#include "musio/CoreEngine.h"
#include "musio/MeterRing.h"
#include "musio/Models.h"

namespace musio {

class EngineService {
 public:
  EngineService();
  ~EngineService();

  /// Open the audio device. Failure is not fatal: the engine still serves RPC so
  /// a UI can report the problem and let the user pick another device.
  bool openAudio(const AudioBackend::Options& options, std::string& error);

  /// Publish telemetry into POSIX shared memory under `shmName`.
  bool startTelemetry(const std::string& shmName, std::string& error);

  bool startRpc(const std::string& socketPath, std::string& error);
  void stop();

  /// Dispatch one RPC call. Public so the CLI can drive it without a socket.
  Json dispatch(const std::string& method, const Json& params);

  bool shutdownRequested() const {
    return shutdownRequested_.load(std::memory_order_acquire);
  }

  CoreEngine& engine() { return engine_; }
  Project& project() { return project_; }
  JucePluginHost& plugins() { return plugins_; }
  AudioBackend& audio() { return audio_; }

  /// Render the current project offline to a WAV file. Uses the same
  /// CoreEngine::process() the device callback uses, so what you hear and what
  /// you render come from one code path.
  bool renderToFile(const std::string& path, SampleCount numSamples, double sampleRate,
                    int blockSize, std::string& error);

 private:
  static Json fail(const std::string& message);
  Json dispatch_projectInfo();

  CoreEngine engine_;
  AudioBackend audio_;
  JucePluginHost plugins_;
  MeterWriter meters_;
  RpcServer rpc_;
  Project project_;
  std::string projectPath_;
  std::string shmName_;

  /// Serialises RPC handling against the CLI and against itself. Never taken by
  /// the audio thread.
  std::mutex controlMutex_;
  std::atomic<bool> shutdownRequested_{false};
};

}  // namespace musio
