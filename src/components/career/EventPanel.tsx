import type { PlayerState } from '../../engine/types';
import { useGameStore } from '../../state/store';

export default function EventPanel({ career }: { career: PlayerState }) {
  const pickEventChoice = useGameStore((s) => s.pickEventChoice);
  const continueAfterEvent = useGameStore((s) => s.continueAfterEvent);
  const lastEventResult = useGameStore((s) => s.lastEventResult);

  if (lastEventResult) {
    return (
      <div className="card animate-pop-in p-6 text-center">
        <p className="text-lg text-ink-100">{lastEventResult}</p>
        <button onClick={continueAfterEvent} className="btn-gold mt-5 rounded-full px-6 py-2 text-sm">
          Continuer
        </button>
      </div>
    );
  }

  if (!career.pendingEvent) {
    return (
      <div className="card p-6 text-center text-ink-300">
        <p>Chargement de la saison...</p>
      </div>
    );
  }

  return (
    <div className="card animate-pop-in p-6">
      <span className="text-xs uppercase tracking-wide text-gold-400">Événement — saison {career.season}</span>
      <h2 className="mt-1 font-display text-2xl text-ink-100">{career.pendingEvent.title}</h2>
      <p className="mt-2 text-ink-300">{career.pendingEvent.text}</p>
      <div className="mt-5 flex flex-col gap-2">
        {career.pendingEvent.choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => pickEventChoice(i)}
            className="btn-outline rounded-lg px-4 py-3 text-left text-sm hover:border-gold-500/50 hover:text-gold-400"
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}
