import os from 'node:os'
import fs from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { AgentSample, HostSample } from '@shared/protocol.ts'

const run = promisify(execFile)

// ── Host ────────────────────────────────────────────────────────────────────

let prevIdle = 0
let prevTotal = 0

export function sampleHost(): HostSample {
  const cpus = os.cpus()
  let idle = 0
  let total = 0
  for (const cpu of cpus) {
    for (const key of Object.keys(cpu.times) as (keyof typeof cpu.times)[]) total += cpu.times[key]
    idle += cpu.times.idle
  }

  let cpu = 0
  if (prevTotal > 0 && total > prevTotal) {
    cpu = Math.round(100 * (1 - (idle - prevIdle) / (total - prevTotal)))
  }
  prevIdle = idle
  prevTotal = total

  const memTotal = os.totalmem()
  const memUsed = memTotal - os.freemem()

  return {
    cpu: clamp(cpu),
    memUsedGB: round1(memUsed / 1024 ** 3),
    memTotalGB: round1(memTotal / 1024 ** 3),
    cores: cpus.length,
    platform: `${os.type()} ${os.release()}`,
    uptime: Math.round(os.uptime()),
  }
}

// ── Per-agent ───────────────────────────────────────────────────────────────

interface ProcRow {
  pid: number
  ppid: number
  pgrp: number
  /** CPU jiffies (Linux) or an already-computed percentage (fallbacks). */
  cpuTicks: number
  rssKB: number
}

interface Prev {
  ticks: number
  at: number
}

const previous = new Map<number, Prev>()
const CLOCK_HZ = 100
const PAGE_KB = 4

/**
 * Samples CPU and memory for every agent, aggregated over the agent's whole
 * process group — a shell alone reports near-zero, but the agent the operator
 * actually launched inside it is what matters.
 */
export async function sampleAgents(agents: { id: string; pid: number }[]): Promise<AgentSample[]> {
  if (agents.length === 0) return []

  let rows: ProcRow[]
  let ticksArePercent = false
  try {
    if (process.platform === 'linux') {
      rows = await readProcfs()
    } else if (process.platform === 'win32') {
      rows = await readWindows()
      ticksArePercent = true
    } else {
      rows = await readPs()
      ticksArePercent = true
    }
  } catch {
    return agents.map((a) => ({ id: a.id, rssMB: 0, cpu: 0, procs: 0 }))
  }

  const byPid = new Map<number, ProcRow>()
  for (const row of rows) byPid.set(row.pid, row)

  const now = Date.now()
  const seen = new Set<number>()
  const samples: AgentSample[] = []

  for (const agent of agents) {
    const members = collectGroup(agent.pid, rows, byPid)
    let rssKB = 0
    let cpu = 0

    for (const member of members) {
      seen.add(member.pid)
      rssKB += member.rssKB
      if (ticksArePercent) {
        cpu += member.cpuTicks
      } else {
        const prev = previous.get(member.pid)
        previous.set(member.pid, { ticks: member.cpuTicks, at: now })
        if (prev && now > prev.at) {
          const deltaSec = (now - prev.at) / 1000
          cpu += ((member.cpuTicks - prev.ticks) / CLOCK_HZ / deltaSec) * 100
        }
      }
    }

    samples.push({
      id: agent.id,
      rssMB: Math.round(rssKB / 1024),
      cpu: Math.round(clamp(cpu, 100 * os.cpus().length)),
      procs: members.length,
    })
  }

  // Drop bookkeeping for processes that are gone so the map cannot grow forever.
  for (const pid of previous.keys()) if (!seen.has(pid)) previous.delete(pid)

  return samples
}

/** Every process sharing the agent's process group, plus any descendants. */
function collectGroup(rootPid: number, rows: ProcRow[], byPid: Map<number, ProcRow>): ProcRow[] {
  const root = byPid.get(rootPid)
  if (!root) return []

  const members = new Map<number, ProcRow>([[rootPid, root]])
  for (const row of rows) {
    if (row.pgrp === rootPid) members.set(row.pid, row)
  }

  // node-pty children usually share the group, but a child that called setsid
  // still shows up through the parent chain.
  let grew = true
  while (grew) {
    grew = false
    for (const row of rows) {
      if (members.has(row.pid)) continue
      if (members.has(row.ppid)) {
        members.set(row.pid, row)
        grew = true
      }
    }
  }

  return [...members.values()]
}

async function readProcfs(): Promise<ProcRow[]> {
  const entries = await fs.readdir('/proc')
  const rows: ProcRow[] = []

  await Promise.all(
    entries.map(async (entry) => {
      if (!/^\d+$/.test(entry)) return
      let stat: string
      try {
        stat = await fs.readFile(`/proc/${entry}/stat`, 'utf8')
      } catch {
        return // Process exited between readdir and read — expected, skip it.
      }

      // The comm field is parenthesised and may contain spaces, so slice past it.
      const close = stat.lastIndexOf(')')
      if (close < 0) return
      const pid = Number(stat.slice(0, stat.indexOf('(')).trim())
      const fields = stat.slice(close + 2).split(' ')
      if (fields.length < 22) return

      rows.push({
        pid,
        ppid: Number(fields[1]),
        pgrp: Number(fields[2]),
        cpuTicks: Number(fields[11]) + Number(fields[12]),
        rssKB: Number(fields[21]) * PAGE_KB,
      })
    }),
  )

  return rows
}

async function readPs(): Promise<ProcRow[]> {
  const { stdout } = await run('ps', ['-axo', 'pid=,ppid=,pgid=,rss=,%cpu='], { timeout: 4000 })
  return stdout
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 5)
    .map((parts) => ({
      pid: Number(parts[0]),
      ppid: Number(parts[1]),
      pgrp: Number(parts[2]),
      rssKB: Number(parts[3]),
      cpuTicks: Number(parts[4]),
    }))
    .filter((row) => Number.isFinite(row.pid))
}

async function readWindows(): Promise<ProcRow[]> {
  const script =
    'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,WorkingSetSize | ConvertTo-Json -Compress'
  const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    timeout: 6000,
    maxBuffer: 8 * 1024 * 1024,
  })
  const parsed = JSON.parse(stdout) as { ProcessId: number; ParentProcessId: number; WorkingSetSize: number }[]
  const list = Array.isArray(parsed) ? parsed : [parsed]
  return list.map((row) => ({
    pid: row.ProcessId,
    ppid: row.ParentProcessId,
    pgrp: row.ParentProcessId, // Windows has no process groups; the tree walk covers it.
    rssKB: Math.round((row.WorkingSetSize || 0) / 1024),
    cpuTicks: 0, // Per-process CPU on Windows needs two perf-counter reads; not worth the cost here.
  }))
}

function clamp(value: number, max = 100): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(max, Math.max(0, value))
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}
