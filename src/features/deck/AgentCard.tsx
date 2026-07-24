import { useEffect, useRef, useState } from 'react'
import type { AgentSnapshot } from '@shared/protocol.ts'
import { kindById } from '@shared/kinds.ts'
import { useAgentTerminal } from '@/hooks/useAgentTerminal.ts'
import { formatMB, formatUptime } from '@/lib/format.ts'
import { IconClear, IconFreeze, IconKill, IconRestart, IconStop } from '@/components/Icons.tsx'
import { closeAgent, renameAgent, restartAgent, stopAgent, useDeck } from '@/store/deck.ts'
import { useUI } from '@/store/ui.ts'

interface AgentCardProps {
  agent: AgentSnapshot
  now: number
}

const STATUS_LABEL: Record<AgentSnapshot['status'], string> = {
  spawning: 'starting',
  live: 'live',
  exited: 'exited',
}

export function AgentCard({ agent, now }: AgentCardProps) {
  const sample = useDeck((s) => s.samples[agent.id])
  const frozen = useUI((s) => Boolean(s.frozen[agent.id]))
  const toggleFrozen = useUI((s) => s.toggleFrozen)
  const clearFrozen = useUI((s) => s.clearFrozen)
  const focusAgent = useUI((s) => s.focusAgent)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(agent.label)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const kind = kindById(agent.kind)
  const terminal = useAgentTerminal({
    id: agent.id,
    frozen,
    onFocus: () => focusAgent(agent.id),
  })

  useEffect(() => {
    if (editing) nameInputRef.current?.select()
  }, [editing])

  // A restart resumes output, so a card left frozen would look dead.
  useEffect(() => {
    if (agent.status === 'spawning') clearFrozen(agent.id)
  }, [agent.status, agent.epoch, agent.id, clearFrozen])

  function commitRename(): void {
    setEditing(false)
    const next = draft.trim()
    if (next && next !== agent.label) renameAgent(agent.id, next)
    else setDraft(agent.label)
  }

  const uptime = agent.status === 'exited' && agent.exitedAt
    ? formatUptime(agent.createdAt, agent.exitedAt)
    : formatUptime(agent.createdAt, now)

  return (
    <section
      className={`card${agent.status === 'exited' ? ' exited' : ''}`}
      data-agent={agent.id}
      aria-label={agent.label}
      onMouseDown={() => focusAgent(agent.id)}
    >
      <header className="card-head">
        <span className="card-badge" style={{ color: `var(--tone-${kind.tone})` }}>
          {kind.badge}
        </span>

        <div className="card-ident">
          {editing ? (
            <input
              ref={nameInputRef}
              className="card-name-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') {
                  setDraft(agent.label)
                  setEditing(false)
                }
                e.stopPropagation()
              }}
              maxLength={40}
              aria-label="Agent name"
            />
          ) : (
            <button
              type="button"
              className="card-name"
              onClick={() => {
                setDraft(agent.label)
                setEditing(true)
              }}
              title="Rename"
            >
              {agent.label}
            </button>
          )}
          <div className="card-sub">
            <span className="card-status">
              <i className={`dot ${agent.status}`} />
              {agent.status === 'exited' && agent.exitCode !== null
                ? `exited ${agent.exitCode}`
                : STATUS_LABEL[agent.status]}
            </span>
            <span>·</span>
            <span>{kind.name}</span>
          </div>
        </div>

        <div className="card-stats">
          <div className="card-stat">
            <span className="card-stat-key">PID</span>
            <span className="card-stat-val">{agent.pid ?? '—'}</span>
          </div>
          <div className="card-stat">
            <span className="card-stat-key">RAM</span>
            <span className="card-stat-val">{sample ? formatMB(sample.rssMB) : '—'}</span>
          </div>
          <div className="card-stat">
            <span className="card-stat-key">CPU</span>
            <span className="card-stat-val">{sample ? `${sample.cpu.toFixed(0)}%` : '—'}</span>
          </div>
          <div className="card-stat">
            <span className="card-stat-key">Up</span>
            <span className="card-stat-val">{uptime}</span>
          </div>
        </div>

        <div className="card-actions">
          <button
            type="button"
            className="card-btn"
            aria-pressed={frozen}
            title={frozen ? 'Resume output' : 'Freeze output'}
            onClick={() => toggleFrozen(agent.id)}
          >
            <IconFreeze />
          </button>
          <button type="button" className="card-btn" title="Clear screen" onClick={terminal.clear}>
            <IconClear />
          </button>
          <button
            type="button"
            className="card-btn"
            title="Stop process"
            disabled={agent.status !== 'live'}
            onClick={() => stopAgent(agent.id)}
          >
            <IconStop />
          </button>
          <button
            type="button"
            className="card-btn"
            title="Restart session"
            onClick={() => restartAgent(agent.id)}
          >
            <IconRestart />
          </button>
          <button
            type="button"
            className="card-btn danger"
            title="Close agent"
            onClick={() => closeAgent(agent.id)}
          >
            <IconKill />
          </button>
        </div>
      </header>

      <div className="card-term" onClick={terminal.focus}>
        <div ref={terminal.containerRef} />
        {frozen && (
          <div className="card-frozen">
            <IconFreeze /> frozen — output buffered
          </div>
        )}
      </div>

      {agent.lastCommand && (
        <footer className="card-foot">
          <span className="card-foot-key">RUN</span>
          <span className="card-foot-cmd" title={agent.lastCommand}>
            {agent.lastCommand}
          </span>
        </footer>
      )}
    </section>
  )
}
