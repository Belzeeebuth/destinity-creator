import { flagEmoji } from '../data/countries';
import { getPosition } from '../data/positions';
import { useGameStore } from '../state/store';

export default function PantheonPage() {
  const pantheon = useGameStore((s) => s.meta.pantheon);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl text-ink-100">🏛️ Panthéon</h1>
      <p className="mt-1 text-sm text-ink-300">Les légendes écrites sur cet appareil, classées par score de légende.</p>

      {pantheon.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-ink-400">
          <p>Aucune légende inscrite pour l'instant.</p>
          <p className="mt-1 text-sm">Termine une carrière pour tenter d'entrer au Panthéon.</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {pantheon.map((entry, i) => {
            const position = getPosition(entry.positionCode as never);
            return (
              <div key={entry.id} className="card flex items-center gap-4 p-4">
                <span className="w-8 text-center font-display text-xl text-gold-400">#{i + 1}</span>
                <span className="text-xl">{flagEmoji(entry.countryCode)}</span>
                <div className="flex-1">
                  <div className="font-display text-lg text-ink-100">{entry.playerName}</div>
                  <div className="text-xs text-ink-400">
                    {entry.countryName} · {position?.name ?? entry.positionCode}
                  </div>
                  <div className="mt-0.5 text-sm text-ink-300">{entry.summary}</div>
                </div>
                <span className="rounded-full bg-gold-500/15 px-3 py-1 text-sm font-semibold text-gold-400">
                  {entry.legendScore}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
