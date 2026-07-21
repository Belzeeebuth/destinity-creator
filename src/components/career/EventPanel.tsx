import { useState } from 'react';
import type { PlayerState } from '../../engine/types';
import { useGameStore } from '../../state/store';
import { formatMoney } from '../../engine/util';

export default function EventPanel({ career }: { career: PlayerState }) {
  const pickEventChoice = useGameStore((s) => s.pickEventChoice);
  const continueAfterEvent = useGameStore((s) => s.continueAfterEvent);
  const lastEventResult = useGameStore((s) => s.lastEventResult);
  const lastEventDeltas = useGameStore((s) => s.lastEventDeltas);
  const [picked, setPicked] = useState<number | null>(null);

  function handlePick(index: number) {
    if (picked !== null) return;
    setPicked(index);
    setTimeout(() => {
      pickEventChoice(index);
      setPicked(null);
    }, 300);
  }

  if (lastEventResult) {
    return (
      <div className="card animate-pop-in p-6 text-center">
        <p className="text-lg text-ink-100">{lastEventResult}</p>
        {lastEventDeltas.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {lastEventDeltas.map((d) => (
              <span
                key={d.key}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                  d.delta > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                }`}
              >
                <span aria-hidden>{d.icon}</span>
                {d.delta > 0 ? '+' : ''}
                {d.isMoney ? formatMoney(Math.abs(d.delta)) : d.delta} {d.label}
              </span>
            ))}
          </div>
        )}
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
      <span className="text-xs uppercase tracking-wide text-gold-400">
        {career.phase === 'mid_season' ? `❄️ Trêve hivernale — mi-saison ${career.season}` : `🗓️ Événement — saison ${career.season}`}
      </span>
      <h2 className="mt-1 font-display text-2xl text-ink-100">{career.pendingEvent.title}</h2>
      <p className="mt-2 text-ink-300">{career.pendingEvent.text}</p>
      <div className="mt-5 flex flex-col gap-2">
        {career.pendingEvent.choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => handlePick(i)}
            className={`choice-option rounded-lg px-4 py-3 text-left text-sm ${
              picked === i ? 'is-selected' : 'btn-outline hover:border-gold-500/50 hover:text-gold-400'
            }`}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}
