import fs from 'node:fs'
import path from 'node:path'
import type { GroupRecord } from '@shared/protocol.ts'

export const WORKSPACE = path.resolve(process.env.DESTINITY_WORKSPACE || process.cwd())
export const STATE_DIR = path.join(WORKSPACE, '.destinity')
export const LOG_DIR = path.join(STATE_DIR, 'logs')

const STATE_FILE = path.join(STATE_DIR, 'state.json')

interface PersistedState {
  groups: GroupRecord[]
}

export function ensureDirs(): void {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

export function loadGroups(): GroupRecord[] {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8')
    const parsed = JSON.parse(raw) as PersistedState
    if (!Array.isArray(parsed.groups)) return []
    return parsed.groups.filter((g) => typeof g?.id === 'string' && typeof g?.name === 'string')
  } catch {
    return []
  }
}

export function saveGroups(groups: GroupRecord[]): void {
  try {
    ensureDirs()
    fs.writeFileSync(STATE_FILE, `${JSON.stringify({ groups } satisfies PersistedState, null, 2)}\n`, 'utf8')
  } catch (err) {
    console.warn('[state] could not persist groups:', (err as Error).message)
  }
}

export function logPathFor(agentId: string): string {
  return path.join(LOG_DIR, `${agentId}.log`)
}
