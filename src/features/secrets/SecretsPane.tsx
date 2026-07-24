import { useMemo, useState } from 'react'
import type { SecretMeta } from '@shared/protocol.ts'
import { KNOWN_KEYS, validateSecretName } from '@shared/secrets.ts'
import { IconKey, IconRestart, IconTrash } from '@/components/Icons.tsx'
import { formatAgo } from '@/lib/format.ts'
import { deleteSecret, restartAgent, setSecret, staleAgentIds, useDeck } from '@/store/deck.ts'

const GLOBAL = '__global__'

export function SecretsPane() {
  const secrets = useDeck((s) => s.secrets)
  const groups = useDeck((s) => s.groups)
  const agents = useDeck((s) => s.agents)

  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [scope, setScope] = useState<string>(GLOBAL)

  const now = Date.now()
  const stale = useMemo(() => staleAgentIds(agents, secrets), [agents, secrets])
  const nameProblem = name.trim() ? validateSecretName(name.trim()) : null
  const canSubmit = Boolean(name.trim()) && Boolean(value) && !nameProblem

  const unset = useMemo(() => {
    const held = new Set(secrets.map((s) => s.name))
    return KNOWN_KEYS.filter((k) => !held.has(k.name))
  }, [secrets])

  const sections = useMemo(() => {
    const globalRows = secrets.filter((s) => s.groupId === null)
    const scoped = groups
      .map((group) => ({ group, rows: secrets.filter((s) => s.groupId === group.id) }))
      .filter((section) => section.rows.length > 0)
    return { globalRows, scoped }
  }, [secrets, groups])

  const globalNames = useMemo(
    () => new Set(secrets.filter((s) => s.groupId === null).map((s) => s.name)),
    [secrets],
  )

  function submit(event: React.FormEvent): void {
    event.preventDefault()
    if (!canSubmit) return
    setSecret(name.trim(), value, scope === GLOBAL ? null : scope)
    // The value is deliberately not kept anywhere on this side once sent.
    setValue('')
    setName('')
  }

  return (
    <div className="pane">
      <div className="pane-head">
        <h1>Keys</h1>
        <span className="deck-tally">
          <b>{secrets.length}</b> stored
        </span>
      </div>

      <p className="pane-lede">
        Injected into every agent's environment at spawn, so the CLI agents pick them up on their
        own. Values are stored on the runtime host and never sent back to this page.
      </p>

      {stale.length > 0 && (
        <div className="notice-bar">
          <span>
            <b>{stale.length}</b> running agent{stale.length > 1 ? 's' : ''} started before your
            latest change and still hold the old environment.
          </span>
          <button type="button" className="btn" onClick={() => stale.forEach(restartAgent)}>
            <IconRestart /> Restart {stale.length > 1 ? 'them' : 'it'}
          </button>
        </div>
      )}

      <form className="secret-form" onSubmit={submit}>
        <div className="secret-form-row">
          <input
            className="input"
            list="known-keys"
            placeholder="ANTHROPIC_API_KEY"
            value={name}
            onChange={(e) => setName(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            aria-label="Variable name"
          />
          <input
            className="input"
            type="password"
            placeholder="value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="new-password"
            aria-label="Value"
          />
          <select
            className="input select"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            aria-label="Scope"
          >
            <option value={GLOBAL}>All agents</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} only
              </option>
            ))}
          </select>
          <button type="submit" className="btn primary" disabled={!canSubmit}>
            Store
          </button>
        </div>
        {nameProblem && <p className="secret-problem">{nameProblem}</p>}
        <datalist id="known-keys">
          {KNOWN_KEYS.map((k) => (
            <option key={k.name} value={k.name}>
              {k.tool}
            </option>
          ))}
        </datalist>
      </form>

      {unset.length > 0 && (
        <div className="secret-suggest">
          <span className="secret-suggest-key">Common</span>
          {unset.slice(0, 8).map((k) => (
            <button
              key={k.name}
              type="button"
              className="chip"
              onClick={() => setName(k.name)}
              title={k.note ? `${k.tool} — ${k.note}` : k.tool}
            >
              {k.name}
            </button>
          ))}
        </div>
      )}

      {secrets.length === 0 ? (
        <p className="pane-empty">
          No keys stored. Agents still inherit whatever the shell that started the runtime exported.
        </p>
      ) : (
        <>
          {sections.globalRows.length > 0 && (
            <SecretSection
              title="All agents"
              rows={sections.globalRows}
              now={now}
              groupId={null}
              shadowed={null}
            />
          )}
          {sections.scoped.map(({ group, rows }) => (
            <SecretSection
              key={group.id}
              title={group.name}
              rows={rows}
              now={now}
              groupId={group.id}
              shadowed={globalNames}
            />
          ))}
        </>
      )}

      <p className="pane-foot">
        Stored at <code>.destinity/secrets.json</code>, mode 600, git-ignored. That is file
        permissions, not encryption. Values found in agent output are masked before they reach the
        screen or the session logs.
      </p>
    </div>
  )
}

function SecretSection({
  title,
  rows,
  now,
  groupId,
  shadowed,
}: {
  title: string
  rows: SecretMeta[]
  now: number
  groupId: string | null
  shadowed: Set<string> | null
}) {
  const byTool = useMemo(() => new Map(KNOWN_KEYS.map((k) => [k.name, k.tool])), [])

  return (
    <div>
      <h2 className="tool-group-title">{title}</h2>
      <div className="tool-list secret-list">
        {rows.map((secret) => (
          <div key={`${secret.groupId ?? 'g'}:${secret.name}`} className="tool-row">
            <IconKey />
            <div className="tool-row-body">
              <div className="tool-row-name">
                {secret.name}
                {shadowed?.has(secret.name) && <span className="tag">overrides global</span>}
              </div>
              <div className="tool-row-ver">
                {secret.tail ? `••••${secret.tail}` : '••••'} · {secret.length} chars ·{' '}
                {formatAgo(secret.updatedAt, now)}
                {byTool.has(secret.name) ? ` · ${byTool.get(secret.name)}` : ''}
              </div>
            </div>
            <button
              type="button"
              className="btn danger"
              onClick={() => deleteSecret(secret.name, groupId)}
              title={`Delete ${secret.name}`}
            >
              <IconTrash />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
