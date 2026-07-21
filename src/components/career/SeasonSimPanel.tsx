import type { PlayerState } from '../../engine/types';
import { useGameStore } from '../../state/store';

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
      <button onClick={runSeasonSim} className="btn-gold rounded-full px-8 py-2.5 text-sm">
        Disputer la saison
      </button>
    </div>
  );
}
