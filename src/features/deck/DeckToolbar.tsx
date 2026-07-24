import { useState } from 'react'
import { broadcastCommand, spawnAgent, useDeck } from '@/store/deck.ts'
import { useUI, type Density } from '@/store/ui.ts'
import { IconPlus } from '@/components/Icons.tsx'

interface DeckToolbarProps {
  title: string
  visibleCount: number
  visibleIds: string[]
}

const DENSITIES: { value: Density; label: string }[] = [
  { value: 'auto', label: 'AUTO' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
]

export function DeckToolbar({ title, visibleCount, visibleIds }: DeckToolbarProps) {
  const total = useDeck((s) => s.agents.length)
  const maxAgents = useDeck((s) => s.limits.maxAgents)
  const activeGroupId = useUI((s) => s.activeGroupId)
  const density = useUI((s) => s.density)
  const setDensity = useUI((s) => s.setDensity)

  const [command, setCommand] = useState('')
  const atCeiling = total >= maxAgents

  function broadcast(): void {
    const next = command.trim()
    if (!next) return
    broadcastCommand(visibleIds, next)
    setCommand('')
  }

  return (
    <div className="deck-bar">
      <div className="deck-heading">
        <h1>{title}</h1>
        <span className="deck-tally">
          <b>{visibleCount}</b> shown / {total} of {maxAgents}
        </span>
      </div>

      <div className="deck-bar-tools">
        <input
          className="input"
          style={{ width: 260, flex: 'none' }}
          value={command}
          placeholder={
            visibleCount ? `Run on ${visibleCount} agent${visibleCount > 1 ? 's' : ''}…` : 'No agents here'
          }
          disabled={visibleCount === 0}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') broadcast()
            e.stopPropagation()
          }}
          aria-label="Broadcast a command to every agent on this deck"
        />
        <button
          type="button"
          className="btn"
          onClick={broadcast}
          disabled={visibleCount === 0 || !command.trim()}
        >
          Run all
        </button>

        <div className="seg" role="group" aria-label="Columns">
          {DENSITIES.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={density === option.value}
              onClick={() => setDensity(option.value)}
              title={option.value === 'auto' ? 'Fit columns to agent count' : `${option.label} columns`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn primary"
          onClick={() => spawnAgent({ groupId: activeGroupId })}
          disabled={atCeiling}
          title={atCeiling ? `Ceiling of ${maxAgents} agents reached` : 'New agent — Ctrl/Cmd+Enter'}
        >
          <IconPlus /> Agent
        </button>
      </div>
    </div>
  )
}
