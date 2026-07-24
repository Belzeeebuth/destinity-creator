import { useMemo } from 'react'
import type { DetectedTool } from '@shared/protocol.ts'
import { refreshTools, spawnAgent, useDeck } from '@/store/deck.ts'
import { useUI } from '@/store/ui.ts'
import { IconRefresh } from '@/components/Icons.tsx'

/** Grouping is presentational only — the runtime probes a flat list. */
const SECTIONS: { title: string; ids: string[] }[] = [
  { title: 'Coding agents', ids: ['claude', 'codex', 'gemini', 'aider'] },
  { title: 'Models', ids: ['ollama'] },
  { title: 'Runtimes', ids: ['node', 'npm', 'pnpm', 'bun', 'deno', 'python', 'uv', 'cargo', 'go'] },
  { title: 'Infra', ids: ['git', 'docker', 'kubectl', 'rg'] },
]

export function ToolsPane() {
  const tools = useDeck((s) => s.tools)
  const activeGroupId = useUI((s) => s.activeGroupId)
  const setTab = useUI((s) => s.setTab)

  const byId = useMemo(() => new Map(tools.map((t) => [t.id, t])), [tools])
  const available = tools.filter((t) => t.available).length

  function launch(tool: DetectedTool): void {
    spawnAgent({ groupId: activeGroupId, command: tool.command })
    setTab('deck')
  }

  return (
    <div className="pane">
      <div className="pane-head">
        <h1>Host tools</h1>
        <span className="deck-tally">
          <b>{available}</b> of {tools.length} available
        </span>
        <div className="header-spacer" />
        <button type="button" className="btn" onClick={refreshTools}>
          <IconRefresh /> Re-probe
        </button>
      </div>

      {tools.length === 0 && <p className="pane-empty">Probing the host…</p>}

      {SECTIONS.map((section) => {
        const rows = section.ids.map((id) => byId.get(id)).filter(Boolean) as DetectedTool[]
        if (rows.length === 0) return null
        return (
          <div key={section.title}>
            <h2 className="tool-group-title">{section.title}</h2>
            <div className="tool-list">
              {rows.map((tool) => (
                <div key={tool.id} className={`tool-row${tool.available ? '' : ' off'}`}>
                  <i className={`dot ${tool.available ? 'open' : 'closed'}`} />
                  <div className="tool-row-body">
                    <div className="tool-row-name">{tool.name}</div>
                    <div className="tool-row-ver" title={tool.version ?? undefined}>
                      {tool.version ?? 'not found on PATH'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    disabled={!tool.available}
                    onClick={() => launch(tool)}
                    title={`Spawn an agent running ${tool.command}`}
                  >
                    Launch
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
