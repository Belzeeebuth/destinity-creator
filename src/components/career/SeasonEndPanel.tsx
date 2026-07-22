import type { PlayerState } from '../../engine/types';
import { useGameStore } from '../../state/store';
import { MIN_VOLUNTARY_RETIREMENT_AGE } from '../../engine/career';
import { MAX_AGE } from '../../engine/types';
import { getPosition } from '../../data/positions';
import { formatMoney } from '../../engine/util';
import { ui } from '../../i18n/ui';

export default function SeasonEndPanel({ career }: { career: PlayerState }) {
  const advanceSeason = useGameStore((s) => s.advanceSeason);
  const retireNow = useGameStore((s) => s.retireNow);
  const language = useGameStore((s) => s.language);
  const record = career.history[career.history.length - 1];
  const canRetire = career.age >= MIN_VOLUNTARY_RETIREMENT_AGE;
  const isGK = getPosition(career.positionCode).code === 'GK';

  return (
    <div className="card p-6">
      <h2 className="font-display text-2xl text-ink-100">
        {ui(language, 'seasonRecapTitle')} {career.season}
      </h2>
      {record && (
        <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <Stat label={ui(language, 'statMatches')} value={record.appearances} />
          {isGK ? (
            <>
              <Stat label={ui(language, 'statCleanSheets')} value={record.cleanSheets} />
              <Stat label={ui(language, 'statSaves')} value={record.saves} />
            </>
          ) : (
            <>
              <Stat label={ui(language, 'statGoals')} value={record.goals} />
              <Stat label={ui(language, 'statAssists')} value={record.assists} />
            </>
          )}
          <Stat label={ui(language, 'statAvgRating')} value={record.avgRating.toFixed(1)} />
        </div>
      )}

      {record && (record.cardsYellow > 0 || record.cardsRed > 0 || record.injuryNote) && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
          {record.cardsYellow > 0 && (
            <span className="rounded-full bg-yellow-500/15 px-3 py-1 font-semibold text-yellow-400">
              🟨 {record.cardsYellow} {ui(language, record.cardsYellow > 1 ? 'yellowCards' : 'yellowCard')}
            </span>
          )}
          {record.cardsRed > 0 && (
            <span className="rounded-full bg-red-500/15 px-3 py-1 font-semibold text-red-400">
              🟥 {record.cardsRed} {ui(language, record.cardsRed > 1 ? 'redCards' : 'redCard')}
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
          <p className="mb-2 text-xs uppercase tracking-wide text-ink-500">{ui(language, 'attributeEvolution')}</p>
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
          <p className="mb-2 text-xs uppercase tracking-wide text-ink-500">{ui(language, 'seasonHighlights')}</p>
          <ul className="flex flex-col gap-1.5 text-sm text-ink-300">
            {career.seasonLog.map((line, i) => (
              <li key={i}>• {line}</li>
            ))}
          </ul>
        </div>
      )}

      {record && (
        <p className="mt-4 text-xs text-ink-500">
          {ui(language, 'estimatedMarketValue')} {formatMoney(record.marketValue)}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button onClick={advanceSeason} className="btn-gold flex-1 rounded-full py-2.5 text-sm">
          {career.age >= MAX_AGE ? ui(language, 'finishCareer') : ui(language, 'continueCareer')}
        </button>
        {canRetire && (
          <button onClick={retireNow} className="btn-outline flex-1 rounded-full py-2.5 text-sm">
            {ui(language, 'retireNowButton')}
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
