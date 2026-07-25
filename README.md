# Musio (Linux)

A Linux DAW: C++/JUCE realtime engine, web UI, two processes.

This is a rewrite, not a port. It grew out of studying
[`mpatti/musio-create`](https://github.com/mpatti/musio-create) — a macOS DAW in
Swift + SwiftUI — and asking whether it could run on Linux. The short answer was
no, not by porting: ~18k of its ~36k lines are SwiftUI, which does not exist on
Linux, and its audio abstraction was not actually an abstraction (see
[docs/architecture.md](docs/architecture.md#what-went-wrong-upstream)). What
*was* worth keeping is the project format and the shape of the models, so this
engine reads and writes the same `.musio` JSON files.

## Layout

```
core/      musio-core   pure C++20, zero dependencies, fully unit-tested
engine/    musio-engine JUCE + JACK/ALSA + VST3 hosting + JSON-RPC server
ui/        musio-ui     Tauri shell (Rust) + TypeScript front-end
docs/      architecture and the IPC contract
```

The layering rule is enforced by the build, not by discipline: `musio-core` is
compiled with no include path to JUCE, JACK, X11 or any plugin SDK. If the
realtime logic ever needs one of those, the build breaks — which is exactly the
failure the upstream project did not get.

## Build

```bash
./scripts/bootstrap.sh          # fetches JUCE 8.0.6, CLAP headers, nlohmann/json
cmake -B build -G Ninja
cmake --build build
ctest --test-dir build --output-on-failure
```

Build dependencies on Debian/Ubuntu:

```bash
sudo apt install build-essential cmake ninja-build pkg-config \
  libjack-jackd2-dev libasound2-dev libx11-dev libxext-dev libxrandr-dev \
  libxcursor-dev libxinerama-dev libfreetype6-dev libfontconfig1-dev \
  libglu1-mesa-dev libcurl4-openssl-dev
```

Core alone, with no audio or GUI libraries at all:

```bash
cmake -B build-core -G Ninja -DMUSIO_BUILD_ENGINE=OFF
cmake --build build-core && ctest --test-dir build-core
```

## Run

```bash
E=build/engine/musio-engine_artefacts/RelWithDebInfo/musio-engine

$E --list-devices                        # enumerate JACK / ALSA outputs
$E --scan-plugins                        # scan VST3 + LV2 directories
$E --render out.wav --seconds 8 --click  # offline render, no audio device needed
$E --serve                               # open a device and serve JSON-RPC
```

`--render` is the path that works anywhere, including CI and containers with no
sound server. It drives the same `CoreEngine::process()` the device callback
drives, so the offline result and the live result cannot drift apart.

Then the UI, in a second terminal:

```bash
cd ui && npm install && npm run app
```

## Status

Honest state of each piece:

| Area | State | Notes |
|---|---|---|
| Sample-accurate transport, loop splitting | **Done** | Verified buffer-size-invariant across 32–4096 frames |
| Metronome, beat grid, accents | **Done** | Click positions verified exact and buffer-size-invariant |
| Lock-free command queue | **Done** | Threaded test, 200k messages, zero loss |
| Mixer: gain, pan, mute, solo, master | **Done** | Equal-power pan, verified numerically |
| Shared-memory telemetry (seqlock) | **Done** | Hammer-tested, zero torn reads |
| `.musio` project read/write | **Done** | Lossless round-trip, matches Swift's encoding |
| Offline WAV render | **Done** | |
| JSON-RPC control surface | **Done** | Unix socket, newline-delimited JSON |
| JACK / ALSA output | **Compiles, untested live** | No audio server in the dev container |
| VST3 / LV2 hosting | **Compiles, untested live** | No plugins installed in the dev container |
| Web UI | **Type-checks, not yet run** | Needs `libwebkit2gtk-4.1-dev` to build |
| Audio clip playback | **Not started** | Interface defined; needs file decode + streaming |
| MIDI input (ALSA seq) | **Not started** | |
| Plugin editor windows | **Not started** | Needs X11 embedding |
| CLAP hosting | **Not started** | Headers vendored; JUCE cannot host CLAP |

The engine is not a usable DAW yet. What is finished is the hard, load-bearing
part — the realtime core and its contracts — and it is finished with tests that
run on a machine with no sound card.

## Licence

MIT.
