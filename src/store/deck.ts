/**
 * Mirror of the runtime's state.
 *
 * Nothing in here is authoritative — the server owns the agents, this store
 * only reflects what it last told us. Actions are therefore fire-and-forget
 * sends; the UI updates when the resulting `agent` broadcast comes back.
 */

import { create } from 'zustand'
import type {
  AgentSample,
  AgentSnapshot,
  DetectedTool,
  GroupRecord,
  HostSample,
  RuntimeLimits,
} from '@shared/protocol.ts'
import { bridge, nextReqId, type LinkState } from '@/lib/bridge.ts'

export interface DeckState {
  link: LinkState
  ready: boolean
  workspace: string
  limits: RuntimeLimits
  agents: AgentSnapshot[]
  groups: GroupRecord[]
  tools: DetectedTool[]
  host: HostSample | null
  samples: Record<string, AgentSample>
  notice: { id: number; text: string } | null
}

const EMPTY_LIMITS: RuntimeLimits = { maxAgents: 12, scrollbackBytes: 0 }

export const useDeck = create<DeckState>(() => ({
  link: 'connecting',
  ready: false,
  workspace: '',
  limits: EMPTY_LIMITS,
  agents: [],
  groups: [],
  tools: [],
  host: null,
  samples: {},
  notice: null,
}))

const set = useDeck.setState
const get = useDeck.getState

// ── Applied by src/lib/wire.ts as messages arrive ───────────────────────────

export function applyReady(payload: {
  agents: AgentSnapshot[]
  groups: GroupRecord[]
  tools: DetectedTool[]
  host: HostSample
  limits: RuntimeLimits
  workspace: string
}): void {
  set({
    ready: true,
    agents: payload.agents,
    groups: payload.groups,
    tools: payload.tools,
    host: payload.host,
    limits: payload.limits,
    workspace: payload.workspace,
  })
}

export function applyAgent(agent: AgentSnapshot): void {
  set((state) => {
    const index = state.agents.findIndex((a) => a.id === agent.id)
    if (index === -1) return { agents: [...state.agents, agent] }
    const agents = state.agents.slice()
    agents[index] = agent
    return { agents }
  })
}

export function applyGone(id: string): void {
  set((state) => {
    const samples = { ...state.samples }
    delete samples[id]
    return { agents: state.agents.filter((a) => a.id !== id), samples }
  })
}

export function applySamples(host: HostSample, list: AgentSample[]): void {
  const samples: Record<string, AgentSample> = {}
  for (const sample of list) samples[sample.id] = sample
  set({ host, samples })
}

export function applyGroups(groups: GroupRecord[]): void {
  set({ groups })
}

export function applyTools(tools: DetectedTool[]): void {
  set({ tools })
}

export function setLink(link: LinkState): void {
  set((state) => ({ link, ready: link === 'open' ? state.ready : state.ready }))
}

let noticeSeq = 0
export function notify(text: string): void {
  set({ notice: { id: ++noticeSeq, text } })
}

export function dismissNotice(id: number): void {
  if (get().notice?.id === id) set({ notice: null })
}

// ── Commands ────────────────────────────────────────────────────────────────

export function spawnAgent(options: { groupId?: string | null; command?: string } = {}): void {
  const { agents, limits } = get()
  if (agents.length >= limits.maxAgents) {
    notify(`Agent ceiling reached (${limits.maxAgents}). Close one before opening another.`)
    return
  }
  bridge.send({
    t: 'spawn',
    reqId: nextReqId(),
    groupId: options.groupId ?? null,
    command: options.command,
    // Real geometry lands with the first resize once the card has measured itself.
    cols: 80,
    rows: 24,
  })
}

export const sendInput = (id: string, data: string): void => bridge.send({ t: 'input', id, data })
export const attachAgent = (id: string, cols: number, rows: number): void =>
  bridge.send({ t: 'attach', id, cols, rows })
export const resizeAgent = (id: string, cols: number, rows: number): void =>
  bridge.send({ t: 'resize', id, cols, rows })
export const interruptAgent = (id: string): void => bridge.send({ t: 'interrupt', id })
export const stopAgent = (id: string): void => bridge.send({ t: 'stop', id })
export const restartAgent = (id: string): void => bridge.send({ t: 'restart', id })
export const closeAgent = (id: string): void => bridge.send({ t: 'close', id })
export const renameAgent = (id: string, label: string): void => bridge.send({ t: 'rename', id, label })
export const assignAgent = (id: string, groupId: string | null): void =>
  bridge.send({ t: 'assign', id, groupId })
export const refreshTools = (): void => bridge.send({ t: 'tools:refresh' })

export function broadcastCommand(ids: string[], command: string): void {
  if (!ids.length || !command.trim()) return
  bridge.send({ t: 'run', ids, command })
  notify(`Sent to ${ids.length} agent${ids.length > 1 ? 's' : ''}: ${command}`)
}

export function createGroup(name: string): string | null {
  const trimmed = name.trim().slice(0, 32)
  if (!trimmed) return null
  const group: GroupRecord = { id: `grp-${Date.now().toString(36)}`, name: trimmed, createdAt: Date.now() }
  const groups = [...get().groups, group]
  set({ groups })
  bridge.send({ t: 'groups', groups })
  return group.id
}

export function removeGroup(id: string): void {
  const groups = get().groups.filter((g) => g.id !== id)
  set({ groups })
  bridge.send({ t: 'groups', groups })
}

// ── Selectors ───────────────────────────────────────────────────────────────

export function agentsInGroup(agents: AgentSnapshot[], groupId: string | null): AgentSnapshot[] {
  return agents.filter((a) => (a.groupId ?? null) === groupId)
}
