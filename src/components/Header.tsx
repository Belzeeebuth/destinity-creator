import { useDeck } from '@/store/deck.ts'
import { useUI } from '@/store/ui.ts'
import { IconRail } from '@/components/Icons.tsx'

const LINK_LABEL = { open: 'link', connecting: 'linking', closed: 'no link' } as const

export function Header() {
  const tab = useUI((s) => s.tab)
  const setTab = useUI((s) => s.setTab)
  const toggleRail = useUI((s) => s.toggleRail)
  const railOpen = useUI((s) => s.railOpen)

  const agents = useDeck((s) => s.agents)
  const tools = useDeck((s) => s.tools)
  const host = useDeck((s) => s.host)
  const link = useDeck((s) => s.link)

  const availableTools = tools.filter((t) => t.available).length
  const memPercent = host && host.memTotalGB > 0 ? (host.memUsedGB / host.memTotalGB) * 100 : 0

  return (
    <header className="header">
      <div className="brand">
        <span className="brand-mark" />
        <span className="brand-name">
          Destinity <span>Creator</span>
        </span>
      </div>

      <button
        type="button"
        className="btn icon"
        onClick={toggleRail}
        aria-pressed={railOpen}
        title="Toggle the group rail"
      >
        <IconRail />
      </button>

      <nav className="tabs" role="tablist" aria-label="Sections">
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={tab === 'deck'}
          onClick={() => setTab('deck')}
        >
          Deck <span className="tab-count">{agents.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={tab === 'tools'}
          onClick={() => setTab('tools')}
        >
          Tools <span className="tab-count">{availableTools}</span>
        </button>
      </nav>

      <div className="header-spacer" />

      <div className="header-meters">
        <Meter label="CPU" value={host?.cpu ?? 0} text={`${Math.round(host?.cpu ?? 0)}%`} />
        <Meter
          label="MEM"
          value={memPercent}
          text={host ? `${host.memUsedGB.toFixed(1)}G` : '—'}
        />
      </div>

      <div className="link-state">
        <i className={`dot ${link}`} />
        {LINK_LABEL[link]}
      </div>
    </header>
  )
}

function Meter({ label, value, text }: { label: string; value: number; text: string }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="meter" title={`${label} ${text}`}>
      <span className="meter-key">{label}</span>
      <span className="meter-track">
        <span className={`meter-fill${clamped > 80 ? ' hot' : ''}`} style={{ width: `${clamped}%` }} />
      </span>
      <span>{text}</span>
    </div>
  )
}
