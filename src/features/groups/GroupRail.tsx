import { useMemo, useState } from 'react'
import { createGroup, removeGroup, useDeck } from '@/store/deck.ts'
import { useUI } from '@/store/ui.ts'
import { IconKill, IconPlus, IconTerminal } from '@/components/Icons.tsx'

export function GroupRail() {
  const agents = useDeck((s) => s.agents)
  const groups = useDeck((s) => s.groups)
  const activeGroupId = useUI((s) => s.activeGroupId)
  const setActiveGroup = useUI((s) => s.setActiveGroup)

  const [name, setName] = useState('')

  const counts = useMemo(() => {
    const map = new Map<string | null, number>()
    for (const agent of agents) {
      const key = agent.groupId ?? null
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [agents])

  function submit(): void {
    const id = createGroup(name)
    if (!id) return
    setName('')
    setActiveGroup(id)
  }

  return (
    <aside className="rail">
      <div className="rail-section">
        <div className="rail-title">Decks</div>
        <button
          type="button"
          className="rail-item"
          aria-current={activeGroupId === null}
          onClick={() => setActiveGroup(null)}
        >
          <IconTerminal />
          <span className="rail-item-name">Main deck</span>
          <span className="rail-item-count">{counts.get(null) ?? 0}</span>
        </button>
      </div>

      <div className="rail-section grow">
        <div className="rail-title">
          <span>Groups</span>
          <span className="rail-item-count">{groups.length}</span>
        </div>

        {groups.length === 0 && <p className="rail-empty">No groups yet.</p>}

        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            className="rail-item"
            aria-current={activeGroupId === group.id}
            onClick={() => setActiveGroup(group.id)}
          >
            <span className="rail-item-name">{group.name}</span>
            <span className="rail-item-count">{counts.get(group.id) ?? 0}</span>
            <span
              className="rail-item-x"
              role="button"
              tabIndex={-1}
              title="Delete group — its agents return to the main deck"
              onClick={(e) => {
                e.stopPropagation()
                if (activeGroupId === group.id) setActiveGroup(null)
                removeGroup(group.id)
              }}
            >
              <IconKill size={12} />
            </span>
          </button>
        ))}

        <div className="rail-add">
          <input
            className="input"
            value={name}
            placeholder="New group"
            maxLength={32}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              e.stopPropagation()
            }}
            aria-label="New group name"
          />
          <button type="button" className="btn icon" onClick={submit} disabled={!name.trim()}>
            <IconPlus />
          </button>
        </div>
      </div>
    </aside>
  )
}
