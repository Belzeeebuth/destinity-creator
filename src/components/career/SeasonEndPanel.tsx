import type { PlayerState } from '../../engine/types';
import { useGameStore } from '../../state/store';
import { MIN_VOLUNTARY_RETIREMENT_AGE } from '../../engine/career';
import { MAX_AGE } from '../../engine/types';
import { formatMoney } from '../../engine/util';

export default function SeasonEndPanel({ career }: { career: PlayerState }) {
  const advanceSeason = useGameStore((s) => s.advanceSeason);
  const retireNow = useGameStore((s) => s.retireNow);
  const record = career.history[career.history.length - 1];
  const canRetire = career.age >= MIN_VOLUNTARY_RETIREMENT_AGE;

  return (
    <div className="card p-6">
      <h2 className="font-display text-2xl text-ink-100">Bilan de la saison {career.season}</h2>
      {record && (
        <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <Stat label="Matchs" value={record.appearances} />
          <Stat label="Buts" value={record.goals} />
          <Stat label="Passes D." value={record.assists} />
          <Stat label="Note moy." value={record.avgRating.toFixed(1)} />
        </div>
      )}

      {career.lastSeasonNarrative.length > 0 && (
        <ul className="mt-5 flex flex-col gap-2 text-sm text-ink-300">
          {career.lastSeasonNarrative.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-gold-400">›</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      {career.seasonLog.length > 0 && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-ink-500">Faits marquants de la saison</p>
          <ul className="flex flex-col gap-1.5 text-sm text-ink-300">
            {career.seasonLog.map((line, i) => (
              <li key={i}>• {line}</li>
            ))}
          </ul>
        </div>
      )}

      {record && (
        <p className="mt-4 text-xs text-ink-500">
          Valeur marchande estimée : {formatMoney(record.marketValue)}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button onClick={advanceSeason} className="btn-gold flex-1 rounded-full py-2.5 text-sm">
          {career.age >= MAX_AGE ? 'Terminer ma carrière' : 'Continuer la carrière →'}
        </button>
        {canRetire && (
          <button onClick={retireNow} className="btn-outline flex-1 rounded-full py-2.5 text-sm">
            Prendre ma retraite maintenant
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <div className="font-display text-xl text-ink-100">{value}</div>
      <div className="text-[11px] text-ink-500">{label}</div>
    </div>
  );
}
