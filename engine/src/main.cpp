// musio-engine: the headless realtime audio process.
//
//   musio-engine --list-devices
//   musio-engine --scan-plugins
//   musio-engine --render out.wav [--project p.musio] [--seconds 8] [--click]
//   musio-engine --serve [--socket PATH] [--backend JACK|ALSA] [--buffer 256]
//
// --render is the one that works anywhere, including CI and containers with no
// sound server: it drives the exact same CoreEngine::process() the device
// callback drives, so the offline result and the live result come from one code
// path rather than two that drift apart.
#include <juce_core/juce_core.h>
#include <juce_events/juce_events.h>

#include <atomic>
#include <chrono>
#include <csignal>
#include <cstdio>
#include <cstring>
#include <string>
#include <thread>

#include "EngineService.h"
#include "musio/Persistence.h"

namespace {

using musio::Json;

std::atomic<bool> gSignalled{false};

void onSignal(int) { gSignalled.store(true, std::memory_order_release); }

struct Args {
  bool listDevices = false;
  bool scanPlugins = false;
  bool serve = false;
  bool click = false;
  bool help = false;
  std::string renderPath;
  std::string projectPath;
  std::string socketPath;
  std::string backend;
  std::string device;
  std::string shmName = "musio-engine";
  double seconds = 8.0;
  double sampleRate = 48000.0;
  double tempo = 0.0;
  int bufferSize = 512;
};

const char* kUsage =
    "musio-engine -- Musio realtime audio engine (Linux)\n"
    "\n"
    "  --list-devices           enumerate JACK/ALSA output devices and exit\n"
    "  --scan-plugins           scan VST3/LV2 directories and list what is found\n"
    "  --render FILE.wav        render offline to a WAV file (no audio device needed)\n"
    "  --serve                  open an audio device and serve JSON-RPC\n"
    "\n"
    "  --project FILE.musio     project to load first\n"
    "  --seconds N              render length (default 8)\n"
    "  --click                  enable the metronome\n"
    "  --tempo BPM              override the project tempo\n"
    "  --sample-rate N          render sample rate (default 48000)\n"
    "  --buffer N               device buffer size in frames (default 512)\n"
    "  --backend JACK|ALSA      force an audio backend\n"
    "  --device NAME            device name to open\n"
    "  --socket PATH            RPC socket path\n"
    "  --shm NAME               shared-memory telemetry name\n"
    "  --help\n";

bool parseArgs(int argc, char** argv, Args& args, std::string& error) {
  const auto needValue = [&](int& i, const char* flag) -> const char* {
    if (i + 1 >= argc) {
      error = std::string("missing value after ") + flag;
      return nullptr;
    }
    return argv[++i];
  };

  for (int i = 1; i < argc; ++i) {
    const std::string flag = argv[i];

    if (flag == "--help" || flag == "-h") {
      args.help = true;
    } else if (flag == "--list-devices") {
      args.listDevices = true;
    } else if (flag == "--scan-plugins") {
      args.scanPlugins = true;
    } else if (flag == "--serve") {
      args.serve = true;
    } else if (flag == "--click") {
      args.click = true;
    } else if (flag == "--render") {
      const char* v = needValue(i, "--render");
      if (v == nullptr) return false;
      args.renderPath = v;
    } else if (flag == "--project") {
      const char* v = needValue(i, "--project");
      if (v == nullptr) return false;
      args.projectPath = v;
    } else if (flag == "--socket") {
      const char* v = needValue(i, "--socket");
      if (v == nullptr) return false;
      args.socketPath = v;
    } else if (flag == "--backend") {
      const char* v = needValue(i, "--backend");
      if (v == nullptr) return false;
      args.backend = v;
    } else if (flag == "--device") {
      const char* v = needValue(i, "--device");
      if (v == nullptr) return false;
      args.device = v;
    } else if (flag == "--shm") {
      const char* v = needValue(i, "--shm");
      if (v == nullptr) return false;
      args.shmName = v;
    } else if (flag == "--seconds") {
      const char* v = needValue(i, "--seconds");
      if (v == nullptr) return false;
      args.seconds = std::atof(v);
    } else if (flag == "--sample-rate") {
      const char* v = needValue(i, "--sample-rate");
      if (v == nullptr) return false;
      args.sampleRate = std::atof(v);
    } else if (flag == "--tempo") {
      const char* v = needValue(i, "--tempo");
      if (v == nullptr) return false;
      args.tempo = std::atof(v);
    } else if (flag == "--buffer") {
      const char* v = needValue(i, "--buffer");
      if (v == nullptr) return false;
      args.bufferSize = std::atoi(v);
    } else {
      error = "unknown argument: " + flag;
      return false;
    }
  }

  if (!args.listDevices && !args.scanPlugins && !args.serve && args.renderPath.empty()) {
    args.help = true;
  }
  return true;
}

int runListDevices() {
  const auto devices = musio::AudioBackend::enumerateDevices();

  if (devices.empty()) {
    std::printf(
        "No audio devices found.\n\n"
        "This build supports JACK and ALSA. On a desktop, PipeWire provides the\n"
        "JACK API via pipewire-jack, which covers PipeWire, JACK and PulseAudio\n"
        "clients at once. In a container there is usually no audio server at all --\n"
        "use --render to work offline.\n");
    return 0;
  }

  std::printf("%-6s %-34s %-9s %s\n", "BACKEND", "DEVICE", "OUT/IN", "RATES");
  for (const auto& d : devices) {
    std::string rates;
    for (std::size_t i = 0; i < d.sampleRates.size() && i < 6; ++i) {
      if (!rates.empty()) rates += ",";
      rates += std::to_string(static_cast<int>(d.sampleRates[i]));
    }
    if (rates.empty()) rates = "(would not open)";

    std::printf("%-6s %-34s %d/%-7d %s%s\n", d.backend.c_str(), d.name.c_str(),
                d.outputChannels, d.inputChannels, rates.c_str(),
                d.isDefault ? "  [default]" : "");
  }
  return 0;
}

int runScanPlugins() {
  musio::JucePluginHost host;

  std::printf("Hostable formats:");
  for (const auto& f : musio::JucePluginHost::supportedFormats()) {
    std::printf(" %s", f.c_str());
  }
  std::printf("\nSearch paths:\n");
  for (const auto& p : musio::JucePluginHost::defaultSearchPaths()) {
    std::printf("  %s\n", p.c_str());
  }

  const int found = host.scan(true);
  std::printf("\n%d plugin(s) found.\n", found);
  if (!host.lastScanError().empty()) {
    std::printf("note: %s\n", host.lastScanError().c_str());
  }

  for (int i = 0; i < found; ++i) {
    musio::PluginDescriptor d;
    if (!host.describePlugin(i, d)) continue;
    std::printf("  [%s] %-40s %-24s %s\n",
                d.kind == musio::PluginKind::Instrument ? "inst" : " fx ", d.name, d.vendor,
                d.path);
  }
  return 0;
}

int runRender(const Args& args) {
  musio::EngineService service;

  if (!args.projectPath.empty()) {
    const Json result = service.dispatch("project.load",
                                         Json::object({{"path", args.projectPath}}));
    if (result.contains("__error")) {
      std::fprintf(stderr, "error: %s\n", result.at("__error").get<std::string>().c_str());
      return 1;
    }
    std::printf("Loaded %s (%zu tracks, %.1f bpm)\n", args.projectPath.c_str(),
                service.project().tracks.size(), service.project().tempo.bpm);
  }

  if (args.tempo > 0.0) {
    service.dispatch("transport.setTempo", Json::object({{"bpm", args.tempo}}));
  }
  if (args.click) {
    service.dispatch("metronome.set", Json::object({{"enabled", true}, {"gain", 0.8}}));
  }

  const double sampleRate =
      args.projectPath.empty() ? args.sampleRate : service.project().sampleRate;
  const auto numSamples =
      static_cast<musio::SampleCount>(args.seconds * sampleRate);

  std::string error;
  if (!service.renderToFile(args.renderPath, numSamples, sampleRate, args.bufferSize,
                            error)) {
    std::fprintf(stderr, "error: %s\n", error.c_str());
    return 1;
  }

  std::printf("Rendered %.2f s (%lld frames @ %.0f Hz) to %s\n", args.seconds,
              static_cast<long long>(numSamples), sampleRate, args.renderPath.c_str());
  return 0;
}

int runServe(const Args& args) {
  musio::EngineService service;

  if (!args.projectPath.empty()) {
    const Json result = service.dispatch("project.load",
                                         Json::object({{"path", args.projectPath}}));
    if (result.contains("__error")) {
      std::fprintf(stderr, "warning: could not load project: %s\n",
                   result.at("__error").get<std::string>().c_str());
    }
  }

  std::string error;
  if (!service.startTelemetry(args.shmName, error)) {
    std::fprintf(stderr, "warning: telemetry disabled: %s\n", error.c_str());
  } else {
    std::printf("Telemetry: /dev/shm/%s\n", args.shmName.c_str());
  }

  musio::AudioBackend::Options options;
  options.backend = args.backend;
  options.deviceName = args.device;
  options.sampleRate = args.sampleRate;
  options.bufferSize = args.bufferSize;

  if (service.openAudio(options, error)) {
    std::printf("Audio: %s / %s @ %.0f Hz, %d frames\n",
                service.audio().currentBackendName().c_str(),
                service.audio().currentDeviceName().c_str(),
                service.audio().currentSampleRate(), service.audio().currentBufferSize());
  } else {
    // Deliberately not fatal: the UI can still connect, see the error, and ask
    // for a different device.
    std::fprintf(stderr, "warning: no audio device (%s)\n", error.c_str());
    std::fprintf(stderr, "         serving RPC anyway; use audio.open to retry\n");
  }

  const std::string socketPath =
      args.socketPath.empty() ? musio::RpcServer::defaultSocketPath() : args.socketPath;

  if (!service.startRpc(socketPath, error)) {
    std::fprintf(stderr, "error: could not start RPC server: %s\n", error.c_str());
    return 1;
  }
  std::printf("RPC: %s\nReady. Ctrl-C to stop.\n", socketPath.c_str());
  std::fflush(stdout);

  std::signal(SIGINT, onSignal);
  std::signal(SIGTERM, onSignal);

  while (!gSignalled.load(std::memory_order_acquire) && !service.shutdownRequested()) {
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
  }

  std::printf("\nShutting down.\n");
  service.stop();
  return 0;
}

}  // namespace

int main(int argc, char** argv) {
  Args args;
  std::string error;

  if (!parseArgs(argc, argv, args, error)) {
    std::fprintf(stderr, "error: %s\n\n%s", error.c_str(), kUsage);
    return 2;
  }

  if (args.help) {
    std::printf("%s", kUsage);
    return 0;
  }

  // JUCE needs its message loop and singletons alive for device enumeration and
  // plugin scanning; this is the console-app equivalent of its app startup.
  juce::ScopedJuceInitialiser_GUI juceInit;

  if (args.listDevices) return runListDevices();
  if (args.scanPlugins) return runScanPlugins();
  if (!args.renderPath.empty()) return runRender(args);
  if (args.serve) return runServe(args);

  std::printf("%s", kUsage);
  return 0;
}
