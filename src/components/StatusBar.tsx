import { shortPath } from '@/lib/format.ts'
import { useDeck } from '@/store/deck.ts'
import { useUI } from '@/store/ui.ts'

const LINK_TEXT = {
  open: 'connected',
  connecting: 'connecting…',
  closed: 'runtime offline — retrying',
} as const

export function StatusBar() {
  const link = useDeck((s) => s.link)
  const workspace = useDeck((s) => s.workspace)
  const agents = useDeck((s) => s.agents)
  const host = useDeck((s) => s.host)
  const focusedAgentId = useUI((s) => s.focusedAgentId)

  const live = agents.filter((a) => a.status === 'live').length
  const focused = agents.find((a) => a.id === focusedAgentId)

  return (
    <footer className="status">
      <span>
        <em>{live}</em> live / {agents.length} open
      </span>
      {focused && (
        <span>
          focus <em>{focused.label}</em>
          {focused.pid ? ` · pid ${focused.pid}` : ''} · {focused.cols}×{focused.rows}
        </span>
      )}
      <span className="status-spacer" />
      {host && (
        <span>
          {host.platform} · {host.cores} cores · {host.memUsedGB.toFixed(1)}/
          {host.memTotalGB.toFixed(1)} GB
        </span>
      )}
      <span className="status-path" title={workspace}>
        {shortPath(workspace)}
      </span>
      <span>{LINK_TEXT[link]}</span>
    </footer>
  )
}
