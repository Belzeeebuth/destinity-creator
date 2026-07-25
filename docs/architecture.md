# Architecture

## Why two processes

```
┌──────────────────────────────┐                  ┌──────────────────────────────┐
│ musio-ui          (Tauri)    │                  │ musio-engine    (C++/JUCE)   │
│                              │  JSON-RPC        │                              │
│ • timeline, mixer, transport │  Unix socket     │ • JACK / ALSA output         │
│ • TypeScript + canvas        │◄────────────────►│ • VST3 / LV2 hosting         │
│ • Rust shell owns the socket │  (low rate)      │ • transport, mixer, metronome │
│   and the shm mapping        │                  │ • project load / save         │
│                              │  shared memory   │ • offline render              │
│                              │◄─────────────────│                              │
│                              │  (60 Hz meters)  │                              │
└──────────────────────────────┘                  └──────────────────────────────┘
```

Three reasons, in order of how much they matter:

1. **Plugin crash isolation.** A third-party VST3 that segfaults must not take
   unsaved work with it. Putting the plugin host in its own process is what
   Bitwig does, and it is the single biggest robustness win available.
2. **The UI cannot glitch the audio.** A slow repaint, a garbage-collection
   pause, a `console.log` in a hot path — none of it can reach the audio thread,
   because the audio thread is in another process and the only channel is a
   lock-free queue.
3. **The dense UI work goes where dense UI work is cheap.** A piano roll and a
   mixer are a lot of interaction code; JUCE's widget toolkit is not where you
   want to write it.

## Why two IPC channels

Not an accident of convenience — the two directions have opposite requirements.

| | Control plane | Telemetry |
|---|---|---|
| Transport | JSON-RPC over Unix socket | POSIX shared memory |
| Rate | A few per second | ~60 Hz |
| Volume | Tiny | ~2 KB/snapshot, 256 tracks |
| Needs | Reliability, error messages, ordering | Cheapness; latest value only |
| Loss | Unacceptable | Free — the next frame is 16 ms away |

Sending meters through JSON-RPC would flood the channel that transport commands
depend on. Sending transport commands through shared memory would give up
error reporting. So: commands are requests with replies; meters are a
seqlock-protected snapshot the UI polls and may freely miss.

## The realtime contract

Everything reachable from `CoreEngine::process()` obeys:

- no allocation, no `free`
- no mutex, no syscall, no logging
- no unbounded loop

Buffers are sized once in `prepare()`. The command queue is a fixed-capacity
SPSC ring; when it fills, `post()` returns `false` and increments a counter that
surfaces in `engine.status` — it never blocks and never overwrites. If the device
hands over a block larger than what `prepare()` allocated for, `process()`
outputs silence and counts an underrun rather than allocating on the audio
thread.

## Sample accuracy, and why it is tested the way it is

The transport does not check the loop boundary once per block. At 512 frames /
48 kHz, that would quantise the loop point to 10.6 ms, and it is audible.
Instead `Transport::nextSegment()` hands the caller the longest run with no
discontinuity in it, so a block containing the loop point is split exactly on
that sample:

```cpp
int done = 0;
while (done < numSamples) {
  const auto seg = transport.nextSegment(numSamples - done);
  renderInto(out, done, seg);
  transport.advance(seg.length);
  done += seg.length;
}
```

The property this buys is testable without a sound card, and that is how it is
tested: **the sequence of timeline positions, and the rendered audio itself, must
be identical for every buffer size.** `transport.position_sequence_is_buffer_size_invariant`
runs 32/64/128/256/512/1024/4096 frames through a loop whose length is a multiple
of none of them and compares sample by sample. `engine.rendered_audio_is_buffer_size_invariant`
does the same on the actual float output. A block-quantised transport fails both
immediately.

The metronome is anchored the same way: clicks land at
`round(beatIndex * samplesPerBeat)` on the *timeline*, never relative to the
current block, so they do not move when the buffer size changes and a loop wrap
does not shift the grid.

## What went wrong upstream

Worth recording, because the fix shaped this design.

`mpatti/musio-create` had a branch called `windows-morning-build` and a document
promising a platform abstraction layer. The file that was supposed to *be* that
layer, `DAWCore/Sources/DAWCore/Audio/AudioBackendProtocol.swift`, began:

```swift
import AVFoundation
import AudioToolbox

public protocol AudioBackend: AnyObject {
    func loadInstrument(_ description: AudioComponentDescription,
                        for trackID: TrackID) async throws -> AudioUnit
    func getInstrumentAudioUnit(for trackID: TrackID) -> AudioUnit?
}
```

Apple types in the seam's own signatures. No WASAPI, ALSA or JACK backend can
conform to that protocol without rewriting the protocol, which is why their own
parity matrix listed the audio backend as **Blocked**. `AudioBackendFactory`
had no conditional compilation at all — it returned `CoreAudioBackend()` or
`LegacyAVAudioEngineBackend()` unconditionally.

Two structural answers here:

1. **`core/include/musio/Plugin.h` is plain data.** A plugin is an opaque
   `PluginRef` (a `uint64_t`) plus a POD `PluginDescriptor` with fixed-size
   char fields. There is deliberately no `getNativeHandle()` escape hatch —
   that is precisely how the Apple types leaked.
2. **The rule is mechanical.** `musio-core` is compiled with no include path to
   JUCE or any plugin SDK, so a leak is a build failure rather than something a
   reviewer has to notice. `core/CMakeLists.txt` links exactly `musio_json`,
   `pthread` and `rt`.

Their `PlatformCapabilities.swift` also treated Linux as a dead branch by
construction: `defaultAudioBackend` returned `.unavailable` and
`supportedPluginFormats` returned `[]` for anything that was not macOS or
Windows. There was no `#if os(Linux)` anywhere in the repository.

## Project format compatibility

`.musio` files are read and written to match Foundation's `JSONEncoder` as the
macOS app configures it (`[.prettyPrinted, .sortedKeys]`, `.iso8601` dates).
Three Swift encoding details had to be reproduced exactly:

- UUIDs are **uppercase** hyphenated strings.
- A single-property wrapper struct such as `TrackID { let rawValue: UUID }`
  encodes as a nested object, `{"rawValue": "..."}`, not a bare string.
- Enums with associated values use Swift's synthesised form — unlabelled
  payloads are keyed `_0`, labelled ones keep their labels:

  ```
  case midi(MIDIClipData)               ->  {"midi": {"_0": {...}}}
  case controlChange(controller:value:) ->  {"controlChange": {"controller":74,"value":64}}
  case empty                            ->  {"empty": {}}
  ```

Every model also retains the JSON object it was parsed from, and saving re-emits
that object with only the understood fields overwritten. So `vRack`, `dawState`,
`metadata`, automation lanes, tempo maps, plugin state blobs and MIDI CC events
survive a load/save cycle untouched even though the engine does not model them
yet. A DAW that silently drops a user's plugin state is worse than one that
refuses to open the file, and
`persistence.unmodelled_sections_survive_a_round_trip` asserts it.

## RPC surface

Newline-delimited JSON, one object per line, over a Unix socket at
`$XDG_RUNTIME_DIR/musio-engine.sock` (mode 0600).

```
engine.status                  engine.shutdown
audio.listDevices              audio.open {backend,device,sampleRate,bufferSize}
audio.close
transport.play / pause / stop  transport.seek {samples|beats}
transport.setTempo {bpm}       transport.setTimeSignature {numerator,denominator}
transport.setLoop {enabled,startSamples,endSamples}
metronome.set {enabled,gain}
mixer.setTrack {slot,gain,pan,muted,soloed}
mixer.setMasterGain {gain}
project.new {name}             project.load {path}      project.save {path}
project.info
plugins.scan {rescanAll,paths} plugins.list
meters.info
```

Track identity crosses the boundary as a dense `slot` integer, never a UUID:
the audio thread must not be doing string or UUID comparisons. The control plane
owns the UUID ↔ slot mapping.

## Layer map

| Layer | Depends on | Testable without audio hardware |
|---|---|---|
| `musio-core` | nothing but libstdc++, `rt`, `pthread`, nlohmann | **Yes, entirely** |
| `engine/AudioBackend` | JUCE, JACK, ALSA | No |
| `engine/PluginHost` | JUCE, VST3 SDK | Scan path only |
| `engine/RpcServer` | POSIX sockets | Yes |
| `ui` | Tauri, webkit2gtk | Type-check only |

60 tests cover the first row. That is deliberate: the layer that carries the
musical correctness is also the layer with no dependencies, so a CI runner with
no sound card verifies the part that matters.

## Next

In dependency order:

1. **Audio clip playback** — a streaming reader feeding `AudioClipData` through
   `CoreEngine`. `AudioFileReference` and the clip model already parse; what is
   missing is decode plus a disk-read thread with prebuffering. The audio thread
   must only ever pop from a ring buffer.
2. **Live audio verification** on a real PipeWire/JACK desktop, including an
   xrun-under-load measurement. Everything device-side is currently
   compile-verified only.
3. **MIDI input** via ALSA sequencer, feeding the existing `ScheduledMidiEvent`
   path.
4. **Plugin editor windows** — X11 embedding, the fiddliest remaining piece.
5. **CLAP hosting** against the vendored headers. JUCE cannot host CLAP, so this
   is a direct implementation of `IPluginHost`.
