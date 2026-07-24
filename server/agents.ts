import fs from 'node:fs'
import os from 'node:os'
import { EventEmitter } from 'node:events'
import * as pty from 'node-pty'
import { resolveKind, SHELL_KIND } from '@shared/kinds.ts'
import type { AgentSnapshot } from '@shared/protocol.ts'
import { logPathFor, ensureDirs, WORKSPACE } from './state.ts'
import { Redactor } from './redact.ts'
import { secrets } from './secrets.ts'

export const MAX_AGENTS = Number(process.env.DESTINITY_MAX_AGENTS || 12)
export const SCROLLBACK_BYTES = Number(process.env.DESTINITY_SCROLLBACK || 256 * 1024)

/**
 * How long a partially-matched secret tail may be withheld before it is
 * released. Chunks that split a value arrive microseconds apart, so this only
 * ever fires when the match was a coincidence and no more output is coming.
 */
const REDACT_FLUSH_MS = 60

interface Agent {
  snap: AgentSnapshot
  proc: pty.IPty | null
  /** Ring buffer of masked output, replayed when a browser attaches. */
  scrollback: string[]
  scrollbackBytes: number
  /** Accumulated keystrokes since the last Enter, used to auto-label. */
  inputLine: string
  inEscape: boolean
  log: fs.WriteStream | null
  redactor: Redactor
  flushTimer: NodeJS.Timeout | null
}

export interface SpawnOptions {
  groupId: string | null
  command?: string
  cwd?: string
  cols: number
  rows: number
}

type Events = {
  agent: [AgentSnapshot]
  data: [string, number, string]
  gone: [string]
}

export class AgentManager extends EventEmitter<Events> {
  private agents = new Map<string, Agent>()
  private counter = 0

  list(): AgentSnapshot[] {
    return [...this.agents.values()].map((a) => a.snap)
  }

  livePids(): { id: string; pid: number }[] {
    return [...this.agents.values()]
      .filter((a) => a.snap.status === 'live' && a.snap.pid)
      .map((a) => ({ id: a.snap.id, pid: a.snap.pid as number }))
  }

  spawn(options: SpawnOptions): AgentSnapshot {
    if (this.agents.size >= MAX_AGENTS) {
      throw new Error(`Agent ceiling reached (${MAX_AGENTS}). Close one before opening another.`)
    }

    const id = `agent-${Date.now().toString(36)}-${++this.counter}`
    const cwd = resolveCwd(options.cwd)
    const shell = defaultShell()

    const agent: Agent = {
      snap: {
        id,
        label: `Agent ${this.counter}`,
        labelLocked: false,
        kind: SHELL_KIND.id,
        status: 'spawning',
        groupId: options.groupId,
        pid: null,
        shell,
        cwd,
        cols: options.cols,
        rows: options.rows,
        createdAt: Date.now(),
        spawnedAt: 0,
        exitedAt: null,
        exitCode: null,
        lastCommand: '',
        bytesOut: 0,
        epoch: 1,
      },
      proc: null,
      scrollback: [],
      scrollbackBytes: 0,
      inputLine: '',
      inEscape: false,
      log: openLog(id),
      redactor: new Redactor(),
      flushTimer: null,
    }

    this.agents.set(id, agent)
    this.start(agent, options.command)
    return agent.snap
  }

  private start(agent: Agent, command?: string): void {
    const { snap } = agent

    let proc: pty.IPty
    try {
      proc = pty.spawn(snap.shell, [], {
        name: 'xterm-256color',
        cols: snap.cols,
        rows: snap.rows,
        cwd: snap.cwd,
        env: {
          ...(process.env as Record<string, string>),
          // Vault keys win over anything the shell that started the runtime
          // happened to export, so the panel is the single source of truth.
          ...secrets.envFor(snap.groupId),
          // Runtime-owned last: the vault refuses these names, and this makes
          // that guarantee structural rather than a matter of validation.
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          DESTINITY_AGENT: snap.id,
        },
      })
    } catch (err) {
      snap.status = 'exited'
      snap.exitedAt = Date.now()
      snap.exitCode = -1
      this.push(agent, `\r\n[destinity] could not start ${snap.shell}: ${(err as Error).message}\r\n`)
      this.emit('agent', snap)
      return
    }

    agent.proc = proc
    snap.pid = proc.pid
    snap.status = 'live'
    // Stamped after the spawn succeeds, so the env it captured is the vault as
    // of this moment — that is exactly what staleness is measured against.
    snap.spawnedAt = Date.now()

    proc.onData((chunk) => {
      snap.bytesOut += chunk.length
      this.push(agent, chunk)
    })

    proc.onExit(({ exitCode }) => {
      if (agent.proc !== proc) return // Superseded by a restart; ignore the old process.
      agent.proc = null
      snap.status = 'exited'
      snap.exitedAt = Date.now()
      snap.exitCode = exitCode
      snap.pid = null
      this.push(agent, `\r\n[destinity] session ended (exit ${exitCode})\r\n`)
      this.emit('agent', snap)
    })

    this.emit('agent', snap)

    if (command?.trim()) {
      // Let the shell print its prompt first, otherwise the echo interleaves.
      setTimeout(() => this.write(snap.id, `${command.trim()}\r`), 120)
    }
  }

  write(id: string, data: string): void {
    const agent = this.agents.get(id)
    if (!agent?.proc) return
    this.trackInput(agent, data)
    agent.proc.write(data)
  }

  resize(id: string, cols: number, rows: number): void {
    const agent = this.agents.get(id)
    if (!agent) return
    const safeCols = Math.max(2, Math.min(500, Math.floor(cols) || 80))
    const safeRows = Math.max(2, Math.min(200, Math.floor(rows) || 24))
    if (agent.snap.cols === safeCols && agent.snap.rows === safeRows) return
    agent.snap.cols = safeCols
    agent.snap.rows = safeRows
    try {
      agent.proc?.resize(safeCols, safeRows)
    } catch {
      // The process can exit between the check and the resize; harmless.
    }
  }

  interrupt(id: string): void {
    this.write(id, '\x03')
  }

  stop(id: string): void {
    const agent = this.agents.get(id)
    if (!agent?.proc) return
    try {
      agent.proc.kill()
    } catch {
      /* already gone */
    }
  }

  restart(id: string): void {
    const agent = this.agents.get(id)
    if (!agent) return

    const previous = agent.proc
    agent.proc = null
    if (previous) {
      try {
        previous.kill()
      } catch {
        /* already gone */
      }
    }

    agent.snap.epoch += 1
    agent.snap.status = 'spawning'
    agent.snap.exitedAt = null
    agent.snap.exitCode = null
    agent.snap.bytesOut = 0
    agent.snap.lastCommand = ''
    agent.snap.kind = agent.snap.labelLocked ? agent.snap.kind : SHELL_KIND.id
    agent.scrollback = []
    agent.scrollbackBytes = 0
    agent.inputLine = ''
    // Drop any withheld tail with the buffer it belonged to, and pick up the
    // current vault — a restart is how an edited key reaches a running agent.
    this.clearFlush(agent)
    agent.log?.write(`\n--- restart @ ${new Date().toISOString()} ---\n`)

    this.start(agent)
  }

  close(id: string): void {
    const agent = this.agents.get(id)
    if (!agent) return

    // Detach before killing: `onExit` fires a tick later and would otherwise
    // emit an `agent` snapshot after `gone`, resurrecting the card on every
    // client. Clearing `proc` makes that handler's guard reject it.
    const proc = agent.proc
    agent.proc = null
    try {
      proc?.kill()
    } catch {
      /* already gone */
    }

    this.clearFlush(agent)
    agent.log?.end()
    this.agents.delete(id)
    this.emit('gone', id)
  }

  closeAll(): void {
    for (const id of [...this.agents.keys()]) this.close(id)
  }

  rename(id: string, label: string): void {
    const agent = this.agents.get(id)
    if (!agent) return
    const trimmed = label.trim().slice(0, 40)
    agent.snap.label = trimmed || agent.snap.label
    agent.snap.labelLocked = trimmed.length > 0
    this.emit('agent', agent.snap)
  }

  assign(id: string, groupId: string | null): void {
    const agent = this.agents.get(id)
    if (!agent) return
    agent.snap.groupId = groupId
    this.emit('agent', agent.snap)
  }

  /** Drops agents pointing at a group that no longer exists back to the root deck. */
  reconcileGroups(validIds: Set<string>): void {
    for (const agent of this.agents.values()) {
      if (agent.snap.groupId && !validIds.has(agent.snap.groupId)) {
        agent.snap.groupId = null
        this.emit('agent', agent.snap)
      }
    }
  }

  scrollbackOf(id: string): { data: string; epoch: number } | null {
    const agent = this.agents.get(id)
    if (!agent) return null
    return { data: agent.scrollback.join(''), epoch: agent.snap.epoch }
  }

  /**
   * The single funnel for everything an agent emits. Masking happens here so
   * the scrollback, the log on disk and every connected browser are all fed
   * from the same already-redacted text — there is no path around it.
   */
  private push(agent: Agent, chunk: string): void {
    const safe = agent.redactor.push(chunk, secrets.values())
    if (safe) this.deliver(agent, safe)
    this.scheduleFlush(agent)
  }

  private deliver(agent: Agent, chunk: string): void {
    agent.scrollback.push(chunk)
    agent.scrollbackBytes += chunk.length
    while (agent.scrollbackBytes > SCROLLBACK_BYTES && agent.scrollback.length > 1) {
      agent.scrollbackBytes -= agent.scrollback.shift()!.length
    }
    agent.log?.write(chunk)
    this.emit('data', agent.snap.id, agent.snap.epoch, chunk)
  }

  private scheduleFlush(agent: Agent): void {
    if (agent.flushTimer) {
      clearTimeout(agent.flushTimer)
      agent.flushTimer = null
    }
    if (!agent.redactor.pending) return
    agent.flushTimer = setTimeout(() => {
      agent.flushTimer = null
      const rest = agent.redactor.flush()
      if (rest) this.deliver(agent, rest)
    }, REDACT_FLUSH_MS)
    agent.flushTimer.unref()
  }

  private clearFlush(agent: Agent): void {
    if (agent.flushTimer) clearTimeout(agent.flushTimer)
    agent.flushTimer = null
    agent.redactor = new Redactor()
  }

  /**
   * Rebuilds the command line from raw keystrokes so the agent can name itself
   * the moment the operator hits Enter — reading it off the input is far more
   * reliable than trying to parse it back out of the terminal output.
   */
  private trackInput(agent: Agent, data: string): void {
    for (const char of data) {
      if (agent.inEscape) {
        // CSI/SS3 sequences end on a byte in the @-~ range.
        if (char >= '@' && char <= '~') agent.inEscape = false
        continue
      }
      if (char === '\x1b') {
        agent.inEscape = true
      } else if (char === '\r' || char === '\n') {
        this.commitInput(agent)
      } else if (char === '\x7f' || char === '\b') {
        agent.inputLine = agent.inputLine.slice(0, -1)
      } else if (char === '\x03' || char === '\x15') {
        agent.inputLine = '' // Ctrl+C / Ctrl+U discard the line.
      } else if (char >= ' ') {
        agent.inputLine += char
      }
    }
    if (agent.inputLine.length > 512) agent.inputLine = agent.inputLine.slice(-512)
  }

  private commitInput(agent: Agent): void {
    const line = agent.inputLine.trim()
    agent.inputLine = ''
    if (!line) return

    agent.snap.lastCommand = line.length > 160 ? `${line.slice(0, 157)}…` : line
    const kind = resolveKind(line)
    agent.snap.kind = kind.id
    if (!agent.snap.labelLocked && kind.id !== SHELL_KIND.id) agent.snap.label = kind.name
    this.emit('agent', agent.snap)
  }
}

function defaultShell(): string {
  if (process.env.DESTINITY_SHELL) return process.env.DESTINITY_SHELL
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'powershell.exe'
  }
  return process.env.SHELL || '/bin/bash'
}

function resolveCwd(requested?: string): string {
  const candidate = requested || WORKSPACE
  try {
    if (fs.statSync(candidate).isDirectory()) return candidate
  } catch {
    /* fall through */
  }
  return os.homedir()
}

function openLog(id: string): fs.WriteStream | null {
  try {
    ensureDirs()
    return fs.createWriteStream(logPathFor(id), { flags: 'a' })
  } catch (err) {
    console.warn('[agents] logging disabled:', (err as Error).message)
    return null
  }
}
