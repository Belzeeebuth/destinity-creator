import { useEffect, useMemo, useRef, useState } from 'react'
import {
  assignAgent,
  closeAgent,
  interruptAgent,
  refreshTools,
  restartAgent,
  spawnAgent,
  stopAgent,
  useDeck,
} from '@/store/deck.ts'
import { useUI } from '@/store/ui.ts'

interface Action {
  id: string
  label: string
  note?: string
  run: () => void
}

export function CommandPalette() {
  const open = useUI((s) => s.paletteOpen)
  const setPalette = useUI((s) => s.setPalette)
  const setActiveGroup = useUI((s) => s.setActiveGroup)
  const setTab = useUI((s) => s.setTab)
  const setDensity = useUI((s) => s.setDensity)
  const activeGroupId = useUI((s) => s.activeGroupId)
  const focusedAgentId = useUI((s) => s.focusedAgentId)

  const agents = useDeck((s) => s.agents)
  const groups = useDeck((s) => s.groups)

  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const focused = agents.find((a) => a.id === focusedAgentId) ?? null

  const actions = useMemo<Action[]>(() => {
    const list: Action[] = [
      {
        id: 'spawn',
        label: 'New agent on this deck',
        note: 'Ctrl+Enter',
        run: () => spawnAgent({ groupId: activeGroupId }),
      },
      { id: 'tab-deck', label: 'Go to deck', run: () => setTab('deck') },
      { id: 'tab-tools', label: 'Go to tools', run: () => setTab('tools') },
      { id: 'tools-refresh', label: 'Re-probe host tools', run: refreshTools },
      { id: 'deck-main', label: 'Show main deck', run: () => setActiveGroup(null) },
    ]

    for (const density of [1, 2, 3, 4] as const) {
      list.push({
        id: `density-${density}`,
        label: `Layout: ${density} column${density > 1 ? 's' : ''}`,
        run: () => setDensity(density),
      })
    }
    list.push({ id: 'density-auto', label: 'Layout: auto columns', run: () => setDensity('auto') })

    for (const group of groups) {
      list.push({
        id: `group-${group.id}`,
        label: `Show group: ${group.name}`,
        note: 'deck',
        run: () => setActiveGroup(group.id),
      })
    }

    if (focused) {
      const name = focused.label
      list.push(
        { id: 'f-interrupt', label: `Interrupt ${name}`, note: 'Ctrl+C', run: () => interruptAgent(focused.id) },
        { id: 'f-stop', label: `Stop ${name}`, run: () => stopAgent(focused.id) },
        { id: 'f-restart', label: `Restart ${name}`, run: () => restartAgent(focused.id) },
        { id: 'f-close', label: `Close ${name}`, run: () => closeAgent(focused.id) },
      )
      for (const group of groups) {
        if (group.id === focused.groupId) continue
        list.push({
          id: `f-move-${group.id}`,
          label: `Move ${name} → ${group.name}`,
          note: 'group',
          run: () => assignAgent(focused.id, group.id),
        })
      }
      if (focused.groupId) {
        list.push({
          id: 'f-move-root',
          label: `Move ${name} → Main deck`,
          note: 'group',
          run: () => assignAgent(focused.id, null),
        })
      }
    }

    for (const agent of agents) {
      list.push({
        id: `jump-${agent.id}`,
        label: `Jump to ${agent.label}`,
        note: agent.status,
        run: () => {
          setActiveGroup(agent.groupId ?? null)
          setTab('deck')
          // The card mounts on the next paint; focus once it exists.
          requestAnimationFrame(() => {
            const node = document.querySelector<HTMLElement>(
              `[data-agent="${CSS.escape(agent.id)}"] .xterm-helper-textarea`,
            )
            node?.focus()
          })
        },
      })
    }

    return list
  }, [activeGroupId, agents, focused, groups, setActiveGroup, setDensity, setTab])

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return actions.slice(0, 40)
    return actions.filter((a) => a.label.toLowerCase().includes(needle)).slice(0, 40)
  }, [actions, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setCursor(0)
    // Autofocus after the element is actually in the tree.
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(matches.length - 1, 0)))
  }, [matches.length])

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [cursor, matches])

  if (!open) return null

  function choose(action: Action | undefined): void {
    if (!action) return
    setPalette(false)
    action.run()
  }

  return (
    <div
      className="palette-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setPalette(false)
      }}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          ref={inputRef}
          className="palette-input"
          value={query}
          placeholder="Run a command…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setCursor((c) => (matches.length ? (c + 1) % matches.length : 0))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setCursor((c) => (matches.length ? (c - 1 + matches.length) % matches.length : 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              choose(matches[cursor])
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setPalette(false)
            }
            e.stopPropagation()
          }}
        />

        <div className="palette-list" ref={listRef} role="listbox" aria-label="Commands">
          {matches.length === 0 && <p className="palette-hint">Nothing matches “{query}”.</p>}
          {matches.map((action, index) => (
            <button
              key={action.id}
              type="button"
              role="option"
              className="palette-row"
              aria-selected={index === cursor}
              onMouseEnter={() => setCursor(index)}
              onClick={() => choose(action)}
            >
              <span className="palette-row-label">{action.label}</span>
              {action.note && <span className="palette-row-note">{action.note}</span>}
            </button>
          ))}
        </div>

        <div className="palette-foot">
          <span>
            <b>↑↓</b> move
          </span>
          <span>
            <b>↵</b> run
          </span>
          <span>
            <b>esc</b> close
          </span>
        </div>
      </div>
    </div>
  )
}
