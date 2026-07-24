import { useEffect } from 'react'
import { Header } from '@/components/Header.tsx'
import { StatusBar } from '@/components/StatusBar.tsx'
import { Toast } from '@/components/Toast.tsx'
import { AgentDeck } from '@/features/deck/AgentDeck.tsx'
import { GroupRail } from '@/features/groups/GroupRail.tsx'
import { CommandPalette } from '@/features/palette/CommandPalette.tsx'
import { ToolsPane } from '@/features/tools/ToolsPane.tsx'
import { spawnAgent, useDeck } from '@/store/deck.ts'
import { useUI } from '@/store/ui.ts'

export function App() {
  const tab = useUI((s) => s.tab)
  const railOpen = useUI((s) => s.railOpen)

  useGlobalKeys()

  return (
    <div className="shell">
      <Header />
      <div className={`body${railOpen ? '' : ' no-rail'}`}>
        {railOpen && <GroupRail />}
        {tab === 'deck' ? <AgentDeck /> : <ToolsPane />}
      </div>
      <StatusBar />
      <CommandPalette />
      <Toast />
    </div>
  )
}

/**
 * Shortcuts are bound on the window with `capture`, because a focused xterm
 * swallows keystrokes before they ever bubble to React.
 */
function useGlobalKeys(): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const mod = event.ctrlKey || event.metaKey
      if (!mod) return

      if (event.key === 'k' || event.key === 'K') {
        event.preventDefault()
        const { paletteOpen, setPalette } = useUI.getState()
        setPalette(!paletteOpen)
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        const { activeGroupId, setTab } = useUI.getState()
        setTab('deck')
        spawnAgent({ groupId: activeGroupId })
        return
      }

      // Ctrl/Cmd+1..9 jumps between decks: 1 is the main deck, then groups.
      if (event.key >= '1' && event.key <= '9') {
        const index = Number(event.key) - 1
        const { groups } = useDeck.getState()
        const target = index === 0 ? null : groups[index - 1]?.id
        if (index === 0 || target) {
          event.preventDefault()
          useUI.getState().setActiveGroup(target ?? null)
          useUI.getState().setTab('deck')
        }
      }
    }

    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [])
}
