// Musio UI.
//
// Structure mirrors the IPC split. Anything the user *commands* goes out over
// JSON-RPC and is confirmed (or refused, with a message) by the engine.
// Anything the user *observes* -- play head, meters -- comes from the
// shared-memory snapshot and is redrawn on a timer. The UI holds no audio state
// of its own, so it can never disagree with what you hear.

import {
  engine,
  startMeterPolling,
  formatBarsBeats,
  formatSamples,
  formatDb,
  type Meters,
  type ProjectInfo,
} from "./engine";

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (el === null) throw new Error(`missing element #${id}`);
  return el as T;
};

// ---------------------------------------------------------------- app state

interface UiState {
  project: ProjectInfo | null;
  meters: Meters | null;
  connected: boolean;
  clickOn: boolean;
  loopOn: boolean;
  /// Slots the user is currently dragging, so incoming state does not fight the
  /// pointer.
  dragging: Set<string>;
}

const state: UiState = {
  project: null,
  meters: null,
  connected: false,
  clickOn: false,
  loopOn: false,
  dragging: new Set(),
};

const log = $("log");

function say(message: string, kind: "info" | "ok" | "error" = "info"): void {
  log.textContent = message;
  log.className = kind === "info" ? "log" : `log ${kind}`;
}

/// Every engine call funnels through here so a dead engine produces one clear
/// message instead of a cascade of unhandled rejections.
async function guard<T>(what: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    const result = await fn();
    if (!state.connected) {
      state.connected = true;
      say("Connected to engine.", "ok");
    }
    return result;
  } catch (e) {
    state.connected = false;
    const detail = e instanceof Error ? e.message : String(e);
    say(`${what} failed: ${detail}`, "error");
    return null;
  }
}

// ---------------------------------------------------------------- transport

$("btn-play").addEventListener("click", () => void guard("play", engine.play));
$("btn-pause").addEventListener("click", () => void guard("pause", engine.pause));
$("btn-stop").addEventListener("click", () => void guard("stop", engine.stop));

$("btn-click").addEventListener("click", async () => {
  state.clickOn = !state.clickOn;
  const done = await guard("metronome", () => engine.setMetronome(state.clickOn, 0.7));
  if (done === null) state.clickOn = !state.clickOn; // roll back on refusal
  renderTransportToggles();
});

$("btn-loop").addEventListener("click", async () => {
  const project = state.project;
  if (project === null) return;

  state.loopOn = !state.loopOn;
  const start = project.loopStartSamples ?? 0;
  // Default to a 4-bar loop when the project has no region of its own.
  const beatsPerBar = project.timeSignature.numerator;
  const fallbackEnd =
    start + Math.round((project.sampleRate * 60) / project.tempoBpm) * beatsPerBar * 4;
  const end = project.loopEndSamples ?? fallbackEnd;

  const done = await guard("loop", () => engine.setLoop(state.loopOn, start, end));
  if (done === null) {
    state.loopOn = !state.loopOn;
  } else {
    project.isLoopEnabled = state.loopOn;
    project.loopStartSamples = start;
    project.loopEndSamples = end;
  }
  renderTransportToggles();
});

const tempoInput = $<HTMLInputElement>("tempo");
tempoInput.addEventListener("change", async () => {
  const bpm = Number.parseFloat(tempoInput.value);
  if (!Number.isFinite(bpm)) return;
  const done = await guard("set tempo", () => engine.setTempo(bpm));
  if (done !== null && state.project !== null) state.project.tempoBpm = bpm;
});

const sigNum = $<HTMLInputElement>("sig-num");
const sigDen = $<HTMLInputElement>("sig-den");
const onSigChange = async (): Promise<void> => {
  const n = Number.parseInt(sigNum.value, 10);
  const d = Number.parseInt(sigDen.value, 10);
  if (!Number.isInteger(n) || !Number.isInteger(d)) return;
  const done = await guard("set time signature", () => engine.setTimeSignature(n, d));
  if (done !== null && state.project !== null) {
    state.project.timeSignature = { numerator: n, denominator: d };
  }
};
sigNum.addEventListener("change", () => void onSigChange());
sigDen.addEventListener("change", () => void onSigChange());

const masterGain = $<HTMLInputElement>("master-gain");
masterGain.addEventListener("input", () => {
  const gain = Number.parseFloat(masterGain.value);
  $("master-db").textContent = formatDb(gain);
  void guard("master gain", () => engine.setMasterGain(gain));
});

function renderTransportToggles(): void {
  $("btn-click").classList.toggle("active", state.clickOn);
  $("btn-click").setAttribute("aria-pressed", String(state.clickOn));
  $("btn-loop").classList.toggle("active", state.loopOn);
  $("btn-loop").setAttribute("aria-pressed", String(state.loopOn));
  $("btn-play").classList.toggle("playing", state.meters?.isPlaying === true);
}

// Keyboard shortcuts follow DAW convention: space toggles, return stops.
document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement) return;

  if (event.code === "Space") {
    event.preventDefault();
    if (state.meters?.isPlaying === true) void guard("pause", engine.pause);
    else void guard("play", engine.play);
  } else if (event.code === "Enter") {
    event.preventDefault();
    void guard("stop", engine.stop);
  } else if (event.code === "KeyK") {
    $("btn-click").click();
  } else if (event.code === "KeyL") {
    $("btn-loop").click();
  }
});

// ------------------------------------------------------------------- tracks

function renderTracks(project: ProjectInfo): void {
  const container = $("tracks");
  container.textContent = "";

  for (const track of project.tracks) {
    const row = document.createElement("div");
    row.className = "track";
    row.dataset.slot = String(track.slot);

    // --- name -------------------------------------------------------------
    const head = document.createElement("div");
    head.className = "track-head";

    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.background = colourFor(track.color);
    head.appendChild(swatch);

    const names = document.createElement("div");
    const name = document.createElement("div");
    name.className = "track-name";
    name.textContent = track.name || `Track ${track.slot + 1}`;
    const sub = document.createElement("div");
    sub.className = "track-sub";
    sub.textContent = track.instrument
      ? `${track.type} · ${track.instrument.name}`
      : `${track.type} · ${track.clips} clip${track.clips === 1 ? "" : "s"}` +
        (track.midiNotes > 0 ? ` · ${track.midiNotes} notes` : "");
    names.append(name, sub);
    head.appendChild(names);
    row.appendChild(head);

    // --- mute / solo ------------------------------------------------------
    const buttons = document.createElement("div");
    buttons.className = "track-buttons";

    const mute = document.createElement("button");
    mute.className = `tiny-btn${track.muted ? " on-m" : ""}`;
    mute.textContent = "M";
    mute.title = "Mute";
    mute.addEventListener("click", async () => {
      const next = !track.muted;
      const done = await guard("mute", () => engine.setTrack(track.slot, { muted: next }));
      if (done !== null) {
        track.muted = next;
        mute.classList.toggle("on-m", next);
      }
    });

    const solo = document.createElement("button");
    solo.className = `tiny-btn${track.soloed ? " on-s" : ""}`;
    solo.textContent = "S";
    solo.title = "Solo";
    solo.addEventListener("click", async () => {
      const next = !track.soloed;
      const done = await guard("solo", () => engine.setTrack(track.slot, { soloed: next }));
      if (done !== null) {
        track.soloed = next;
        solo.classList.toggle("on-s", next);
      }
    });

    buttons.append(mute, solo);
    row.appendChild(buttons);

    // --- gain / pan / meter ----------------------------------------------
    const strip = document.createElement("div");
    strip.className = "track-strip";

    const gain = document.createElement("input");
    gain.type = "range";
    gain.min = "0";
    gain.max = "1.5";
    gain.step = "0.01";
    gain.value = String(track.volume);
    gain.title = "Gain";
    gain.setAttribute("aria-label", `${track.name} gain`);
    const dragKey = `gain-${track.slot}`;
    gain.addEventListener("pointerdown", () => state.dragging.add(dragKey));
    gain.addEventListener("pointerup", () => state.dragging.delete(dragKey));
    gain.addEventListener("input", () => {
      const value = Number.parseFloat(gain.value);
      track.volume = value;
      void guard("gain", () => engine.setTrack(track.slot, { gain: value }));
    });

    const pan = document.createElement("input");
    pan.type = "range";
    pan.min = "-1";
    pan.max = "1";
    pan.step = "0.01";
    pan.value = String(track.pan);
    pan.title = "Pan";
    pan.setAttribute("aria-label", `${track.name} pan`);
    pan.addEventListener("input", () => {
      const value = Number.parseFloat(pan.value);
      track.pan = value;
      void guard("pan", () => engine.setTrack(track.slot, { pan: value }));
    });

    const meterWrap = document.createElement("div");
    meterWrap.className = "track-meter";
    const meterFill = document.createElement("div");
    meterFill.className = "meter-fill";
    meterFill.dataset.meterSlot = String(track.slot);
    meterWrap.appendChild(meterFill);

    strip.append(gain, pan, meterWrap);
    row.appendChild(strip);

    const db = document.createElement("div");
    db.className = "track-db mono tiny";
    db.dataset.dbSlot = String(track.slot);
    db.textContent = "-inf";
    row.appendChild(db);

    container.appendChild(row);
  }
}

function colourFor(name: string): string {
  // Mirrors DAWCore's TrackColor cases. Unknown names fall back rather than
  // throwing -- the project file may come from a newer version of the app.
  const table: Record<string, string> = {
    red: "#ff5f5f",
    orange: "#ffa04a",
    yellow: "#ffd54a",
    green: "#3ddc97",
    blue: "#5aa9ff",
    purple: "#b07bff",
    pink: "#ff7bc2",
    gray: "#8a929f",
    grey: "#8a929f",
  };
  return table[name.toLowerCase()] ?? "#5aa9ff";
}

// ----------------------------------------------------------------- timeline

const timeline = $<HTMLCanvasElement>("timeline");

function drawTimeline(): void {
  const ctx = timeline.getContext("2d");
  if (ctx === null) return;

  const dpr = window.devicePixelRatio || 1;
  const width = timeline.clientWidth;
  const height = timeline.clientHeight;
  if (timeline.width !== width * dpr || timeline.height !== height * dpr) {
    timeline.width = Math.floor(width * dpr);
    timeline.height = Math.floor(height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const project = state.project;
  const meters = state.meters;
  if (project === null) return;

  const beatsPerBar = project.timeSignature.numerator || 4;
  const visibleBars = 16;
  const totalBeats = visibleBars * beatsPerBar;
  const pxPerBeat = width / totalBeats;

  // Loop region behind the grid.
  if (project.isLoopEnabled && project.loopStartSamples !== undefined &&
      project.loopEndSamples !== undefined) {
    const spb = (project.sampleRate * 60) / project.tempoBpm;
    const x0 = (project.loopStartSamples / spb) * pxPerBeat;
    const x1 = (project.loopEndSamples / spb) * pxPerBeat;
    ctx.fillStyle = "rgba(90, 169, 255, 0.12)";
    ctx.fillRect(x0, 0, x1 - x0, height);
  }

  // Bar and beat lines.
  for (let beat = 0; beat <= totalBeats; beat += 1) {
    const x = Math.round(beat * pxPerBeat) + 0.5;
    const isBar = beat % beatsPerBar === 0;
    ctx.strokeStyle = isBar ? "#3c4451" : "#252a32";
    ctx.beginPath();
    ctx.moveTo(x, isBar ? 0 : height * 0.55);
    ctx.lineTo(x, height);
    ctx.stroke();

    if (isBar) {
      ctx.fillStyle = "#8a929f";
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillText(String(beat / beatsPerBar + 1), x + 4, 12);
    }
  }

  // Play head.
  if (meters !== null && meters.sampleRate > 0) {
    const x = Math.round(meters.positionInBeats * pxPerBeat) + 0.5;
    ctx.strokeStyle = "#3ddc97";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

// Clicking the ruler seeks. Uses beats so it stays correct across tempo changes.
timeline.addEventListener("click", (event) => {
  const project = state.project;
  if (project === null) return;
  const rect = timeline.getBoundingClientRect();
  const beatsPerBar = project.timeSignature.numerator || 4;
  const pxPerBeat = rect.width / (16 * beatsPerBar);
  const beats = Math.max(0, (event.clientX - rect.left) / pxPerBeat);
  void guard("seek", () => engine.seekBeats(beats));
});

window.addEventListener("resize", drawTimeline);

// -------------------------------------------------------------------- meters

function applyMeters(meters: Meters): void {
  state.meters = meters;

  $("pos-bars").textContent = formatBarsBeats(
    meters.positionInBeats,
    state.project?.timeSignature.numerator ?? 4,
  );
  $("pos-time").textContent = formatSamples(meters.playHeadSamples, meters.sampleRate);

  setMeterWidth($("master-l"), meters.masterPeakL);
  setMeterWidth($("master-r"), meters.masterPeakR);

  for (const el of document.querySelectorAll<HTMLElement>("[data-meter-slot]")) {
    const slot = Number.parseInt(el.dataset.meterSlot ?? "", 10);
    const peak = meters.trackPeak[slot] ?? 0;
    setMeterWidth(el, peak);
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-db-slot]")) {
    const slot = Number.parseInt(el.dataset.dbSlot ?? "", 10);
    el.textContent = formatDb(meters.trackPeak[slot] ?? 0);
  }

  if (!state.dragging.has("tempo") && document.activeElement !== tempoInput) {
    tempoInput.value = meters.tempoBpm.toFixed(1);
  }

  renderTransportToggles();
  drawTimeline();
}

/// Meters are drawn on a dB scale, not linear: a linear bar spends most of its
/// travel in the top 6 dB and looks dead everywhere else.
function setMeterWidth(el: HTMLElement, linear: number): void {
  const db = linear > 1e-6 ? 20 * Math.log10(linear) : -60;
  const fraction = Math.max(0, Math.min(1, (db + 60) / 60));
  el.style.width = `${fraction * 100}%`;
}

// -------------------------------------------------------------------- status

async function refreshStatus(): Promise<void> {
  const status = await guard("engine.status", engine.status);
  if (status === null) return;

  const kv = (k: string, v: string, cls = ""): string =>
    `<div class="kv"><span class="k">${k}</span><span class="v ${cls}">${v}</span></div>`;

  $("status").innerHTML = [
    kv("audio", status.audioOpen ? `${status.backend}` : "closed",
       status.audioOpen ? "good" : "bad"),
    kv("device", status.device || "—"),
    kv("rate", `${Math.round(status.sampleRate)} Hz`),
    kv("buffer", `${status.bufferSize}`),
    kv("latency", status.sampleRate > 0
      ? `${((status.bufferSize / status.sampleRate) * 1000).toFixed(1)} ms`
      : "—"),
    kv("cpu", `${(status.cpuLoad * 100).toFixed(1)} %`),
    kv("xruns", `${status.underruns}`, status.underruns > 0 ? "bad" : ""),
    kv("dropped", `${status.droppedCommands}`, status.droppedCommands > 0 ? "bad" : ""),
    kv("formats", status.pluginFormats.join(" ") || "none"),
    kv("plugins", `${status.knownPlugins}`),
  ].join("");
}

async function refreshProject(): Promise<void> {
  const project = await guard("project.info", engine.projectInfo);
  if (project === null) return;

  state.project = project;
  state.loopOn = project.isLoopEnabled;
  tempoInput.value = project.tempoBpm.toFixed(1);
  sigNum.value = String(project.timeSignature.numerator);
  sigDen.value = String(project.timeSignature.denominator);
  if (project.masterVolume !== undefined) {
    masterGain.value = String(project.masterVolume);
    $("master-db").textContent = formatDb(project.masterVolume);
  }

  const info = [
    `<div class="kv"><span class="k">name</span><span class="v">${escapeHtml(project.name)}</span></div>`,
    `<div class="kv"><span class="k">tracks</span><span class="v">${project.tracks.length}</span></div>`,
    `<div class="kv"><span class="k">format</span><span class="v">v${project.formatVersion}</span></div>`,
    `<div class="kv"><span class="k">length</span><span class="v">${formatSamples(project.durationSamples, project.sampleRate)}</span></div>`,
  ];
  if (project.fromNewerFormatVersion === true) {
    info.push(
      `<div class="kv"><span class="k">warning</span><span class="v bad">newer format</span></div>`,
    );
  }

  const clips = project.clips;
  if (clips !== undefined) {
    const mib = (clips.audioBytes / (1024 * 1024)).toFixed(1);
    info.push(
      `<div class="kv"><span class="k">audio clips</span><span class="v">${clips.clipsPlaced}</span></div>`,
      `<div class="kv"><span class="k">decoded</span><span class="v">${clips.filesLoaded} file${clips.filesLoaded === 1 ? "" : "s"}, ${mib} MiB</span></div>`,
    );
    if (clips.filesResampled > 0) {
      info.push(
        `<div class="kv"><span class="k">resampled</span><span class="v">${clips.filesResampled}</span></div>`,
      );
    }
    // A missing file must never present as silence with no explanation.
    if (clips.filesMissing > 0 || clips.budgetExceeded) {
      info.push(
        `<div class="kv"><span class="k">missing</span><span class="v bad">${clips.filesMissing}</span></div>`,
      );
      say(clips.problems[0] ?? "some clip audio could not be loaded", "error");
    }
  }

  $("project-info").innerHTML = info.join("");

  $<HTMLInputElement>("project-path").value = project.path;
  renderTracks(project);
  renderTransportToggles();
  drawTimeline();
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ------------------------------------------------------------------ sidebar

$("btn-devices").addEventListener("click", async () => {
  const result = await guard("audio.listDevices", engine.listDevices);
  if (result === null) return;

  const container = $("devices");
  container.textContent = "";

  if (result.devices.length === 0) {
    container.innerHTML =
      `<div class="device dim">No JACK or ALSA device found. ` +
      `On a desktop, start PipeWire or JACK.</div>`;
    return;
  }

  for (const device of result.devices) {
    const el = document.createElement("div");
    el.className = "device";
    el.innerHTML =
      `<div>${escapeHtml(device.name)}${device.isDefault ? " ★" : ""}</div>` +
      `<div class="dim">${device.backend} · ${device.outputChannels} out</div>`;
    el.addEventListener("click", async () => {
      const opened = await guard("audio.open", () =>
        engine.openAudio({ backend: device.backend, device: device.name }),
      );
      if (opened !== null) {
        say(`Opened ${device.name} on ${device.backend}.`, "ok");
        await refreshStatus();
      }
    });
    container.appendChild(el);
  }
});

$("btn-scan").addEventListener("click", async () => {
  say("Scanning plugin directories…");
  const result = await guard("plugins.scan", () => engine.scanPlugins(true));
  if (result === null) return;
  say(
    `${result.found} plugin(s) found (${result.formats.join(", ")})` +
      (result.warning !== undefined ? ` — ${result.warning}` : ""),
    "ok",
  );
  await refreshStatus();
});

$("btn-load").addEventListener("click", async () => {
  const path = $<HTMLInputElement>("project-path").value.trim();
  if (path === "") {
    say("Enter a project path first.", "error");
    return;
  }
  const loaded = await guard("project.load", () => engine.loadProject(path));
  if (loaded === null) return;
  say(`Loaded ${path}.`, "ok");
  await refreshProject();
});

$("btn-save").addEventListener("click", async () => {
  const path = $<HTMLInputElement>("project-path").value.trim();
  const saved = await guard("project.save", () =>
    engine.saveProject(path === "" ? undefined : path),
  );
  if (saved === null) return;
  say(`Saved ${saved.path}.`, "ok");
});

$("btn-new").addEventListener("click", async () => {
  const created = await guard("project.new", () => engine.newProject("Untitled"));
  if (created === null) return;
  say("New project.", "ok");
  await refreshProject();
});

// --------------------------------------------------------------------- boot

async function boot(): Promise<void> {
  await refreshStatus();
  if (state.connected) await refreshProject();

  startMeterPolling((meters) => applyMeters(meters), 33);

  // Status and project shape change rarely; polling them at meter rate would be
  // wasteful, and they are the only calls that can fail loudly.
  window.setInterval(() => void refreshStatus(), 1000);

  if (!state.connected) {
    say(
      "Engine not reachable. Start it with: musio-engine --serve",
      "error",
    );
  }
}

void boot();
