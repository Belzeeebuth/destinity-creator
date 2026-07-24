# Destinity Creator

A multi-agent terminal deck. Spawn a dozen real shells side by side, watch them
work, drive them individually or all at once — in a browser, backed by real PTY
sessions on the host.

Each card is a genuine pseudo-terminal, not a log viewer: interactive prompts,
TUIs, colour, resize, Ctrl-C — everything a terminal emulator is expected to do.

## Run it

```bash
npm install
npm run dev
```

Then open <http://localhost:5180>.

`npm run dev` starts two processes: the PTY runtime on `127.0.0.1:7331` and the
Vite dev server on `5180`, which proxies `/agent-socket` through to the runtime.

For a single-process deployment:

```bash
npm run build   # emits dist/
npm start       # runtime serves dist/ and the socket on one port
```

`npm run typecheck` type-checks the client and the server projects separately —
they have different lib/globals, so they get different tsconfigs.

### Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DESTINITY_PORT` | `7331` | Runtime HTTP + WebSocket port |
| `DESTINITY_HOST` | `127.0.0.1` | Bind address |
| `DESTINITY_WORKSPACE` | `process.cwd()` | Working directory every agent starts in |
| `DESTINITY_SHELL` | `$SHELL` / `%COMSPEC%` | Shell to spawn |
| `DESTINITY_MAX_AGENTS` | `12` | Agent ceiling |
| `DESTINITY_SCROLLBACK` | `262144` | Per-agent replay buffer, in bytes |

The default bind is loopback-only, and deliberately so — the socket hands out
shell access to anyone who can reach it. There is no authentication layer.
Don't move it off `127.0.0.1` without putting one in front.

## Architecture

```
browser                          node runtime
┌────────────────────────┐       ┌──────────────────────────────┐
│ React + Zustand        │       │ AgentManager                 │
│  store/deck  (mirror)  │◀─ws──▶│  node-pty sessions           │
│  store/ui    (local)   │       │  scrollback ring buffer      │
│                        │       │  /proc + ps metrics sampler  │
│ lib/wire   (pub/sub) ──┼──────▶│  tool detection              │
│ xterm.js per card      │       │  state.json + per-agent logs │
└────────────────────────┘       └──────────────────────────────┘
```

**Sessions live on the server.** The browser is a viewport, not an owner. Close
the tab, reload, come back an hour later — the shells are still running, and
attaching replays the scrollback so the terminal looks exactly as you left it.
That inversion is the whole design; almost everything else follows from it.

**Terminal bytes never enter React state.** A busy `npm install` emits thousands
of chunks a second, and routing those through a store would mean thousands of
renders a second. `src/lib/wire.ts` is a tiny pub/sub that hands `data` frames
straight to the owning xterm instance. React only ever sees snapshots: status,
label, pid, byte counts — things that change a few times a second at most.

**Restarts carry an epoch.** Restarting an agent kills the old process and
spawns a new one, but the client may still have queued bytes from the corpse.
Each snapshot carries an `epoch` counter; when the terminal notices it changed,
it resets rather than clearing, which also drops any modes the dead shell left
behind — alternate screen, scroll regions, mouse tracking.

**Auto-naming reads input, not output.** Keystrokes are accumulated until Enter,
then the command line is matched against a kind table (`shared/kinds.ts`) to
name and badge the card — `git status` makes it a Git agent, `npm run dev` a
Node one. Parsing input is unambiguous in a way that scraping the last line of
output never is, since prompts and TUIs redraw constantly.

### Layout

| Path | What lives there |
| --- | --- |
| `shared/` | The wire contract and the kind table — imported by both sides, so the protocol cannot drift |
| `server/agents.ts` | PTY lifecycle, scrollback, labelling, groups |
| `server/metrics.ts` | Per-agent CPU/RSS aggregated across the process group |
| `server/detect.ts` | Probes the host for installed tools |
| `server/state.ts` | Group + log persistence under `.destinity/` |
| `src/lib/bridge.ts` | The socket: reconnection with backoff, replay of intent |
| `src/lib/wire.ts` | Byte routing and snapshot dispatch |
| `src/store/` | `deck` mirrors the server; `ui` is purely local (density, freeze, focus) |
| `src/hooks/useAgentTerminal.ts` | xterm lifecycle, freeze buffering, fit-on-resize |
| `src/features/` | Deck, groups, palette, tools |

### Reconnection

`bridge.ts` retries with exponential backoff from 500 ms to 8 s, and retries
immediately when the tab becomes visible or the network comes back — a laptop
waking from sleep reconnects instantly instead of waiting out the backoff.

Intent-carrying messages (`spawn`, `groups`, `tools:refresh`) are queued and
replayed once the socket is live. Keystrokes are deliberately *not* queued:
replaying input into a shell that has moved on is worse than dropping it.

## Features

- **Adaptive grid** — column count follows the agent count, or pin it 1–4.
- **Agent ceiling** — a hard cap (default 12), enforced server-side.
- **Per-agent stats** — PID, RSS, CPU and uptime, aggregated over the whole
  process group so a shell running `npm` reports the tree's usage, not `sh`'s.
- **Freeze** — pause a card's rendering while the process keeps running; up to
  128 KB is held and flushed on resume, and the card resumes automatically on
  restart so a frozen card never looks dead.
- **Broadcast** — run one command across every agent in the current deck.
- **Groups** — sort agents into decks; membership and names persist.
- **Command palette** — `Ctrl/Cmd+K`, filters over agents and actions.
- **Tool detection** — probes the host for ~18 CLIs and reports versions.
- **Log persistence** — every session's raw output lands in `.destinity/logs/`.

### Keyboard

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd+K` | Command palette |
| `Ctrl/Cmd+Enter` | Spawn an agent in the current deck |
| `Ctrl/Cmd+1…9` | Jump to a deck — `1` is the main deck, then groups |

Shortcuts are bound with `capture: true`, because a focused xterm swallows
keystrokes before they reach React.

## Platform notes

Linux and macOS are the tested paths. Metrics come from `/proc/<pid>/stat` where
it exists and fall back to `ps -axo` otherwise. Windows spawns `%COMSPEC%` and
samples through PowerShell CIM; it is implemented but not verified here.
