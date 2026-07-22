import type { PlayerState, PlayStyle } from '../../engine/types';
import { useGameStore } from '../../state/store';

const PLAYSTYLES: { id: PlayStyle; label: string; emoji: string; description: string }[] = [
  { id: 'offensif', label: 'Offensif', emoji: '⚔️', description: 'Plus de buts et de passes décisives, mais plus de cartons et de risques de blessure.' },
  { id: 'equilibre', label: 'Équilibré', emoji: '⚖️', description: 'Une approche neutre, sans excès dans un sens ou dans l’autre.' },
  { id: 'defensif', label: 'Défensif', emoji: '🛡️', description: 'Moins prolifique, mais plus fiable : moins de cartons, moins de blessures, note plus stable.' },
];

export default function SeasonSimPanel({ career }: { career: PlayerState }) {
  const runSeasonSim = useGameStore((s) => s.runSeasonSim);

  return (
    <div className="card flex flex-col items-center gap-4 p-10 text-center">
      <span className="text-4xl">⚽</span>
      <h2 className="font-display text-2xl text-ink-100">La saison {career.season} va commencer</h2>
      <p className="max-w-md text-sm text-ink-300">
        Matchs de championnat, coupes, sélection nationale... découvre comment se déroule ta saison
        avec {career.club ? career.club.name : 'ton statut de libre'}.
      </p>
      <p className="text-xs uppercase tracking-wide text-ink-500">Choisis ton approche tactique pour cette saison</p>
      <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
        {PLAYSTYLES.map((style) => (
          <button
            key={style.id}
            onClick={() => runSeasonSim(style.id)}
            className="choice-option btn-outline flex flex-col items-center gap-1.5 rounded-lg px-4 py-3 text-center hover:border-gold-500/50 hover:text-gold-400"
          >
            <span className="text-2xl">{style.emoji}</span>
            <span className="font-display text-sm text-ink-100">{style.label}</span>
            <span className="text-[11px] text-ink-400">{style.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
