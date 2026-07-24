import { useEffect, useMemo, useState } from 'react'
import { agentsInGroup, spawnAgent, useDeck } from '@/store/deck.ts'
import { columnsFor, useUI } from '@/store/ui.ts'
import { AgentCard } from './AgentCard.tsx'
import { DeckToolbar } from './DeckToolbar.tsx'
import { EmptyDeck } from './EmptyDeck.tsx'

export function AgentDeck() {
  const agents = useDeck((s) => s.agents)
  const groups = useDeck((s) => s.groups)
  const activeGroupId = useUI((s) => s.activeGroupId)
  const density = useUI((s) => s.density)

  const visible = useMemo(() => agentsInGroup(agents, activeGroupId), [agents, activeGroupId])
  const group = groups.find((g) => g.id === activeGroupId)
  const columns = columnsFor(visible.length, density)

  // One clock for every card — cheaper than a timer per terminal.
  const now = useTick(visible.length > 0)

  return (
    <div className="deck">
      <DeckToolbar
        title={group?.name ?? 'Deck'}
        visibleCount={visible.length}
        visibleIds={visible.map((a) => a.id)}
      />

      {visible.length === 0 ? (
        <EmptyDeck
          groupName={group?.name ?? null}
          onSpawn={() => spawnAgent({ groupId: activeGroupId })}
        />
      ) : (
        <div
          className="deck-grid"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {visible.map((agent) => (
            <AgentCard key={agent.id} agent={agent} now={now} />
          ))}
        </div>
      )}
    </div>
  )
}

function useTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [active])
  return now
}
