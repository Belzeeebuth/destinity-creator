/**
 * Wire contract between the browser deck and the PTY runtime.
 * Imported by both `src/` (via Vite) and `server/` (via tsx).
 */

export type AgentStatus = 'spawning' | 'live' | 'exited'

export interface AgentSnapshot {
  id: string
  /** Display name. Auto-derived from the command unless the user renamed it. */
  label: string
  labelLocked: boolean
  /** Resolved kind id from `shared/kinds.ts` — drives the badge + tone. */
  kind: string
  status: AgentStatus
  groupId: string | null
  pid: number | null
  shell: string
  cwd: string
  cols: number
  rows: number
  createdAt: number
  /**
   * When the current process started. Unlike `createdAt` this moves on every
   * restart, which is what tells the Keys pane whether an agent is still
   * running with a stale copy of the vault.
   */
  spawnedAt: number
  exitedAt: number | null
  exitCode: number | null
  /** Last command line the operator submitted into this agent. */
  lastCommand: string
  bytesOut: number
  /**
   * Bumped on every (re)spawn. The terminal view clears its buffer when it
   * sees a new epoch, so a restart does not stack output from two processes.
   */
  epoch: number
}

export interface GroupRecord {
  id: string
  name: string
  createdAt: number
}

export interface AgentSample {
  id: string
  /** Resident set size in MB, summed over the agent's process group. */
  rssMB: number
  /** Percent of one core, summed over the agent's process group. */
  cpu: number
  /** Number of live processes in the group. */
  procs: number
}

export interface HostSample {
  cpu: number
  memUsedGB: number
  memTotalGB: number
  cores: number
  platform: string
  uptime: number
}

export interface DetectedTool {
  id: string
  name: string
  command: string
  version: string | null
  available: boolean
}

export interface RuntimeLimits {
  maxAgents: number
  scrollbackBytes: number
}

/**
 * A stored credential as the browser is allowed to see it — never the value.
 *
 * `tail` is the last four characters, which is enough to tell two keys apart
 * without shipping anything usable. Everything else about a secret stays on
 * the server; there is no message that returns a full value.
 */
export interface SecretMeta {
  name: string
  /** `null` = applies to every agent; otherwise scoped to one group. */
  groupId: string | null
  tail: string
  length: number
  updatedAt: number
}

export type ClientMessage =
  | { t: 'spawn'; reqId: string; groupId: string | null; command?: string; cwd?: string; cols: number; rows: number }
  | { t: 'attach'; id: string; cols: number; rows: number }
  | { t: 'input'; id: string; data: string }
  | { t: 'resize'; id: string; cols: number; rows: number }
  | { t: 'interrupt'; id: string }
  | { t: 'stop'; id: string }
  | { t: 'restart'; id: string }
  | { t: 'close'; id: string }
  | { t: 'rename'; id: string; label: string }
  | { t: 'assign'; id: string; groupId: string | null }
  | { t: 'run'; ids: string[]; command: string }
  | { t: 'groups'; groups: GroupRecord[] }
  | { t: 'tools:refresh' }
  | { t: 'secret:set'; reqId: string; name: string; value: string; groupId: string | null }
  | { t: 'secret:delete'; name: string; groupId: string | null }

export type ServerMessage =
  | {
      t: 'ready'
      agents: AgentSnapshot[]
      groups: GroupRecord[]
      host: HostSample
      tools: DetectedTool[]
      limits: RuntimeLimits
      workspace: string
      secrets: SecretMeta[]
    }
  | { t: 'agent'; agent: AgentSnapshot }
  | { t: 'gone'; id: string }
  | { t: 'data'; id: string; epoch: number; data: string }
  | { t: 'replay'; id: string; epoch: number; data: string }
  | { t: 'samples'; host: HostSample; agents: AgentSample[] }
  | { t: 'tools'; tools: DetectedTool[] }
  | { t: 'groups'; groups: GroupRecord[] }
  | { t: 'secrets'; secrets: SecretMeta[] }
  | { t: 'error'; reqId?: string; message: string }

export const SOCKET_PATH = '/agent-socket'
