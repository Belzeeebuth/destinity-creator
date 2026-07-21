import type { PlayerState } from '../../engine/types';
import { useGameStore } from '../../state/store';
import { MIN_VOLUNTARY_RETIREMENT_AGE } from '../../engine/career';
import { MAX_AGE } from '../../engine/types';
import { getPosition } from '../../data/positions';
import { formatMoney } from '../../engine/util';

export default function SeasonEndPanel({ career }: { career: PlayerState }) {
  const advanceSeason = useGameStore((s) => s.advanceSeason);
  const retireNow = useGameStore((s) => s.retireNow);
  const record = career.history[career.history.length - 1];
  const canRetire = career.age >= MIN_VOLUNTARY_RETIREMENT_AGE;
  const isGK = getPosition(career.positionCode).code === 'GK';

  return (
    <div className="card p-6">
      <h2 className="font-display text-2xl text-ink-100">📋 Bilan de la saison {career.season}</h2>
      {record && (
        <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <Stat label="Matchs" value={record.appearances} />
          {isGK ? (
            <>
              <Stat label="Clean sheets" value={record.cleanSheets} />
              <Stat label="Arrêts" value={record.saves} />
            </>
          ) : (
            <>
              <Stat label="Buts" value={record.goals} />
              <Stat label="Passes D." value={record.assists} />
            </>
          )}
          <Stat label="Note moy." value={record.avgRating.toFixed(1)} />
        </div>
      )}

      {record && (record.cardsYellow > 0 || record.cardsRed > 0 || record.injuryNote) && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
          {record.cardsYellow > 0 && (
            <span className="rounded-full bg-yellow-500/15 px-3 py-1 font-semibold text-yellow-400">
              🟨 {record.cardsYellow} carton{record.cardsYellow > 1 ? 's' : ''} jaune{record.cardsYellow > 1 ? 's' : ''}
            </span>
          )}
          {record.cardsRed > 0 && (
            <span className="rounded-full bg-red-500/15 px-3 py-1 font-semibold text-red-400">
              🟥 {record.cardsRed} carton{record.cardsRed > 1 ? 's' : ''} rouge{record.cardsRed > 1 ? 's' : ''}
            </span>
          )}
          {record.injuryNote && (
            <span className="rounded-full bg-red-500/15 px-3 py-1 font-semibold text-red-400">🩹 {record.injuryNote}</span>
          )}
        </div>
      )}

      {record && record.majorAwards.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {record.majorAwards.map((award) => (
            <span key={award} className="rounded-full bg-gold-500/15 px-3 py-1 text-sm font-semibold text-gold-400">
              🏆 {award}
            </span>
          ))}
        </div>
      )}

      {career.lastGrowthDeltas.length > 0 && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-ink-500">Évolution des attributs</p>
          <div className="flex flex-wrap gap-2">
            {career.lastGrowthDeltas.map((d) => (
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
