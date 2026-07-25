// Client for the engine's two IPC channels.
//
// Control plane  -> JSON-RPC over the Unix socket, proxied by the Rust shell
//                   (browsers cannot open Unix sockets).
// Telemetry      -> the shared-memory meter block, also read by Rust and
//                   forwarded as a plain object.
//
// The split matters: transport commands are rare and want reliability and error
// messages, while meters are 60 Hz and want to be cheap and lossy. Pushing
// meters through JSON-RPC would flood the channel that the transport depends on.

import { invoke } from "@tauri-apps/api/core";

export interface TrackInfo {
  slot: number;
  id: string;
  name: string;
  type: string;
  color: string;
  volume: number;
  pan: number;
  muted: boolean;
  soloed: boolean;
  armed: boolean;
  clips: number;
  midiNotes: number;
  instrument?: { name: string; vendor: string; type: string; uid: string };
}

/// Outcome of the engine's last clip decode pass. Surfaced so a missing audio
/// file reads as an error rather than as unexplained silence.
export interface ClipReport {
  clipsPlaced: number;
  filesLoaded: number;
  filesMissing: number;
  filesResampled: number;
  audioBytes: number;
  budgetExceeded: boolean;
  problems: string[];
}

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  tempoBpm: number;
  timeSignature: { numerator: number; denominator: number };
  sampleRate: number;
  formatVersion: number;
  durationSamples: number;
  isLoopEnabled: boolean;
  loopStartSamples?: number;
  loopEndSamples?: number;
  tracks: TrackInfo[];
  masterVolume?: number;
  fromNewerFormatVersion?: boolean;
  clips: ClipReport;
}

export interface EngineStatus {
  audioOpen: boolean;
  backend: string;
  device: string;
  sampleRate: number;
  bufferSize: number;
  cpuLoad: number;
  underruns: number;
  isPlaying: boolean;
  playHeadSamples: number;
  positionInBeats: number;
  tempoBpm: number;
  droppedCommands: number;
  callbacks: number;
  telemetryShm: string;
  pluginFormats: string[];
  knownPlugins: number;
  scheduledMidiEvents: number;
}

/// Mirrors the `Meters` struct serialised by ui/src-tauri/src/meters.rs, which in
/// turn mirrors musio::MeterPayload. Keep all three in step.
export interface Meters {
  playHeadSamples: number;
  sampleRate: number;
  tempoBpm: number;
  positionInBeats: number;
  isPlaying: boolean;
  loopEnabled: boolean;
  loopStartSamples: number;
  loopEndSamples: number;
  trackCount: number;
  trackPeak: number[];
  trackRms: number[];
  masterPeakL: number;
  masterPeakR: number;
  cpuLoad: number;
  xrunCount: number;
  callbackCount: number;
  bufferSize: number;
  droppedCommands: number;
}

export interface AudioDevice {
  backend: string;
  name: string;
  isDefault: boolean;
  sampleRates: number[];
  bufferSizes: number[];
  outputChannels: number;
  inputChannels: number;
}

export class EngineError extends Error {}

/// Thin RPC wrapper. Every call goes through the Rust `rpc` command, which owns
/// the socket connection and reconnects on demand.
async function rpc<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  try {
    return (await invoke("rpc", { method, params })) as T;
  } catch (e) {
    throw new EngineError(typeof e === "string" ? e : JSON.stringify(e));
  }
}

export const engine = {
  status: () => rpc<EngineStatus>("engine.status"),
  shutdown: () => rpc<void>("engine.shutdown"),

  listDevices: () => rpc<{ devices: AudioDevice[] }>("audio.listDevices"),
  openAudio: (opts: {
    backend?: string;
    device?: string;
    sampleRate?: number;
    bufferSize?: number;
  }) => rpc<Record<string, unknown>>("audio.open", opts),

  play: () => rpc<void>("transport.play"),
  pause: () => rpc<void>("transport.pause"),
  stop: () => rpc<void>("transport.stop"),
  seekSamples: (samples: number) => rpc<void>("transport.seek", { samples }),
  seekBeats: (beats: number) => rpc<void>("transport.seek", { beats }),
  setTempo: (bpm: number) => rpc<void>("transport.setTempo", { bpm }),
  setTimeSignature: (numerator: number, denominator: number) =>
    rpc<void>("transport.setTimeSignature", { numerator, denominator }),
  setLoop: (enabled: boolean, startSamples: number, endSamples: number) =>
    rpc<void>("transport.setLoop", { enabled, startSamples, endSamples }),

  setMetronome: (enabled: boolean, gain?: number) =>
    rpc<void>("metronome.set", gain === undefined ? { enabled } : { enabled, gain }),

  setTrack: (
    slot: number,
    changes: { gain?: number; pan?: number; muted?: boolean; soloed?: boolean },
  ) => rpc<void>("mixer.setTrack", { slot, ...changes }),
  setMasterGain: (gain: number) => rpc<void>("mixer.setMasterGain", { gain }),

  projectInfo: () => rpc<ProjectInfo>("project.info"),
  newProject: (name: string) => rpc<ProjectInfo>("project.new", { name }),
  loadProject: (path: string) => rpc<ProjectInfo>("project.load", { path }),
  saveProject: (path?: string) =>
    rpc<{ ok: boolean; path: string }>("project.save", path ? { path } : {}),

  scanPlugins: (rescanAll = false) =>
    rpc<{ found: number; formats: string[]; warning?: string }>("plugins.scan", {
      rescanAll,
    }),
  listPlugins: () => rpc<{ plugins: unknown[] }>("plugins.list"),

  /// Reads the shared-memory block directly -- no RPC round trip. Returns null
  /// when the engine is not publishing telemetry.
  meters: async (): Promise<Meters | null> => {
    try {
      return (await invoke("meters")) as Meters;
    } catch {
      return null;
    }
  },
};

/// Poll telemetry on an animation-frame cadence and hand each snapshot to `onTick`.
/// Deliberately polling rather than pushing: the meter block is a lossy snapshot,
/// so a dropped frame costs nothing and the engine never blocks on a slow UI.
export function startMeterPolling(
  onTick: (meters: Meters) => void,
  intervalMs = 33,
): () => void {
  let stopped = false;
  let timer: number | undefined;

  const tick = async () => {
    if (stopped) return;
    const m = await engine.meters();
    if (m && !stopped) onTick(m);
    timer = window.setTimeout(tick, intervalMs);
  };

  void tick();

  return () => {
    stopped = true;
    if (timer !== undefined) window.clearTimeout(timer);
  };
}

export function formatSamples(samples: number, sampleRate: number): string {
  if (sampleRate <= 0) return "0:00.000";
  const total = samples / sampleRate;
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  const ms = Math.floor((total % 1) * 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

export function formatBarsBeats(beats: number, beatsPerBar: number): string {
  if (beatsPerBar <= 0) beatsPerBar = 4;
  const bar = Math.floor(beats / beatsPerBar) + 1;
  const beat = Math.floor(beats % beatsPerBar) + 1;
  const tick = Math.floor((beats % 1) * 960);
  return `${bar}.${beat}.${String(tick).padStart(3, "0")}`;
}

export function linearToDb(linear: number): number {
  return linear > 1e-7 ? 20 * Math.log10(linear) : -Infinity;
}

export function formatDb(linear: number): string {
  const db = linearToDb(linear);
  if (!Number.isFinite(db)) return "-inf";
  return `${db >= 0 ? "+" : ""}${db.toFixed(1)}`;
}
