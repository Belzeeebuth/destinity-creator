/**
 * The credential vault.
 *
 * Values live here and nowhere else: they are written into the env of each PTY
 * at spawn, and masked back out of that PTY's output. No message in the wire
 * protocol returns a value, so a browser can add and remove keys but can never
 * read one back.
 *
 * On-disk storage is plaintext protected by file permissions (0600). That is
 * an honest description, not a compromise hidden behind a word: encrypting a
 * file whose key would have to sit next to it buys nothing.
 */

import fs from 'node:fs'
import path from 'node:path'
import type { SecretMeta } from '@shared/protocol.ts'
import { MAX_SECRET_BYTES, validateSecretName } from '@shared/secrets.ts'
import { STATE_DIR, ensureDirs } from './state.ts'

const SECRETS_FILE = path.join(STATE_DIR, 'secrets.json')
const FILE_MODE = 0o600
const MAX_SECRETS = 100

interface StoredSecret {
  name: string
  value: string
  groupId: string | null
  updatedAt: number
}

function metaOf(secret: StoredSecret): SecretMeta {
  return {
    name: secret.name,
    groupId: secret.groupId,
    // Four characters is the usual "which key is this" affordance and stays
    // useless on its own. Short values reveal proportionally more, so they
    // get no tail at all.
    tail: secret.value.length >= 12 ? secret.value.slice(-4) : '',
    length: secret.value.length,
    updatedAt: secret.updatedAt,
  }
}

class SecretStore {
  private secrets: StoredSecret[] = []
  /** Rebuilt on every mutation; read once per output chunk by the redactor. */
  private valueCache: string[] = []

  constructor() {
    this.load()
  }

  private load(): void {
    let raw: string
    try {
      raw = fs.readFileSync(SECRETS_FILE, 'utf8')
    } catch {
      return // No vault yet is the normal first-run case.
    }

    try {
      const mode = fs.statSync(SECRETS_FILE).mode & 0o777
      if (mode & 0o077) {
        console.warn(
          `[secrets] ${SECRETS_FILE} is mode ${mode.toString(8)} — readable beyond your user. Tightening to 600.`,
        )
        fs.chmodSync(SECRETS_FILE, FILE_MODE)
      }
    } catch {
      /* stat/chmod is advisory; a failure here should not block startup */
    }

    try {
      const parsed = JSON.parse(raw) as { secrets?: unknown }
      if (!Array.isArray(parsed.secrets)) return
      this.secrets = parsed.secrets.filter(isStoredSecret).slice(0, MAX_SECRETS)
      this.reindex()
      console.log(`[secrets] loaded ${this.secrets.length} key(s)`)
    } catch (err) {
      console.warn('[secrets] vault unreadable, starting empty:', (err as Error).message)
    }
  }

  private save(): void {
    const payload = `${JSON.stringify({ secrets: this.secrets }, null, 2)}\n`
    const tmp = `${SECRETS_FILE}.tmp`
    try {
      ensureDirs()
      // Write-then-rename so the vault is never half-written, and chmod the
      // temp explicitly because `mode` on writeFileSync only applies to a file
      // it creates — a leftover temp would keep its old permissions.
      fs.writeFileSync(tmp, payload, { mode: FILE_MODE })
      fs.chmodSync(tmp, FILE_MODE)
      fs.renameSync(tmp, SECRETS_FILE)
    } catch (err) {
      console.warn('[secrets] could not persist vault:', (err as Error).message)
      try {
        fs.unlinkSync(tmp)
      } catch {
        /* nothing to clean up */
      }
    }
  }

  private reindex(): void {
    this.valueCache = [...new Set(this.secrets.map((s) => s.value))]
  }

  list(): SecretMeta[] {
    return this.secrets
      .map(metaOf)
      .sort((a, b) => a.name.localeCompare(b.name) || (a.groupId ?? '').localeCompare(b.groupId ?? ''))
  }

  /** Throws with a human-readable reason; the socket turns that into an error. */
  set(name: string, value: string, groupId: string | null): void {
    const trimmedName = name.trim()
    const problem = validateSecretName(trimmedName)
    if (problem) throw new Error(problem)

    // Only the surrounding whitespace goes — a value is otherwise opaque, and
    // trimming the interior would silently corrupt anything multi-line.
    const trimmedValue = value.trim()
    if (!trimmedValue) throw new Error('An empty value would set the variable to nothing. Delete it instead.')
    if (Buffer.byteLength(trimmedValue) > MAX_SECRET_BYTES) throw new Error('That value is too large for an env var.')

    const index = this.secrets.findIndex((s) => s.name === trimmedName && s.groupId === groupId)
    if (index === -1 && this.secrets.length >= MAX_SECRETS) {
      throw new Error(`Vault is full (${MAX_SECRETS} keys).`)
    }

    const record: StoredSecret = { name: trimmedName, value: trimmedValue, groupId, updatedAt: Date.now() }
    if (index === -1) this.secrets.push(record)
    else this.secrets[index] = record

    this.reindex()
    this.save()
  }

  remove(name: string, groupId: string | null): void {
    const before = this.secrets.length
    this.secrets = this.secrets.filter((s) => !(s.name === name && s.groupId === groupId))
    if (this.secrets.length === before) return
    this.reindex()
    this.save()
  }

  /** Drops secrets scoped to groups that no longer exist. */
  reconcileGroups(validIds: Set<string>): boolean {
    const before = this.secrets.length
    this.secrets = this.secrets.filter((s) => s.groupId === null || validIds.has(s.groupId))
    if (this.secrets.length === before) return false
    this.reindex()
    this.save()
    return true
  }

  /** Env for an agent in `groupId`: globals first, group-scoped keys winning. */
  envFor(groupId: string | null): Record<string, string> {
    const env: Record<string, string> = {}
    for (const secret of this.secrets) {
      if (secret.groupId === null) env[secret.name] = secret.value
    }
    if (groupId) {
      for (const secret of this.secrets) {
        if (secret.groupId === groupId) env[secret.name] = secret.value
      }
    }
    return env
  }

  /** Every stored value, for the output redactor. Deduplicated, never sorted by name. */
  values(): string[] {
    return this.valueCache
  }

  /** How many keys an agent in this group would receive. */
  countFor(groupId: string | null): number {
    return Object.keys(this.envFor(groupId)).length
  }
}

function isStoredSecret(value: unknown): value is StoredSecret {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.name === 'string' &&
    typeof record.value === 'string' &&
    typeof record.updatedAt === 'number' &&
    (record.groupId === null || typeof record.groupId === 'string') &&
    validateSecretName(record.name) === null
  )
}

export const secrets = new SecretStore()
export { SECRETS_FILE }
