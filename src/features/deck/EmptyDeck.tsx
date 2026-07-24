import { IconPlus } from '@/components/Icons.tsx'

interface EmptyDeckProps {
  groupName: string | null
  onSpawn: () => void
}

export function EmptyDeck({ groupName, onSpawn }: EmptyDeckProps) {
  return (
    <div className="deck-empty">
      <span className="deck-empty-rule" />
      <h2>{groupName ? `${groupName} is empty` : 'No agents running'}</h2>
      <p>
        Every agent is a real shell on this machine, owned by the runtime rather than by the
        browser — reload the page and they are all still here.
      </p>
      <p>
        <kbd>Ctrl</kbd> <kbd>Enter</kbd> spawns one, <kbd>Ctrl</kbd> <kbd>K</kbd> opens the command
        palette.
      </p>
      <button type="button" className="btn primary" onClick={onSpawn}>
        <IconPlus /> New agent
      </button>
    </div>
  )
}
