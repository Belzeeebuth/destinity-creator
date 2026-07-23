import { useEffect, useRef, useState } from 'react';
import type { PlayerState } from '../../engine/types';
import { overallRating } from '../../engine/types';
import { resolveClubTier } from '../../data/clubs';
import { getCountry } from '../../data/countries';
import { getPosition } from '../../data/positions';
import { formatMoney } from '../../engine/util';
import { useGameStore } from '../../state/store';
import { L } from '../../i18n/language';
import { ui } from '../../i18n/ui';
import CountryFlag from '../ui/CountryFlag';
import SegmentedBar from '../ui/SegmentedBar';

export default function ClubStatusBar({ career }: { career: PlayerState }) {
  const language = useGameStore((s) => s.language);
  const country = getCountry(career.countryCode);
  const clubTier = career.club ? resolveClubTier(career.club, language) : null;
  const overall = overallRating(career.attributes, getPosition(career.positionCode).weights);

  const prevOverallRef = useRef(overall);
  const [delta, setDelta] = useState(0);
  useEffect(() => {
    const diff = Math.round((overall - prevOverallRef.current) * 10) / 10;
    if (diff !== 0) setDelta(diff);
    prevOverallRef.current = overall;
  }, [overall]);

  return (
    <div className="panel-retro">
      <div className="panel-header-bar panel-header-bar--green">
        <span className="flex items-center gap-1.5">
          <CountryFlag code={career.countryCode} showCode={false} />
          {career.firstName} {career.lastName}
          {career.captain && <span className="text-gold-200">©</span>}
        </span>
        <span className="rounded-sm bg-black/25 px-2 py-0.5 font-display text-sm tabular-nums">
          {career.age} {ui(language, 'homeYearsOld')} · {ui(language, 'homeSeasonAge')} {career.season}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xs text-ink-400">{L(language, country.name, country.nameEn)}</div>
          <div className="ml-1 flex flex-col items-center rounded-sm border-2 border-gold-500/50 bg-gold-500/10 px-3 py-1">
            <span className="text-[9px] uppercase tracking-wide text-gold-400/80">{ui(language, 'statusRating')}</span>
            <span className="font-display text-xl font-bold leading-none text-gold-400">{overall.toFixed(1)}</span>
            {delta !== 0 && (
              <span
                key={`${career.season}-${overall}`}
                className={`animate-pop-in text-[11px] font-semibold leading-none ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {delta > 0 ? '+' : ''}
                {delta.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <Info
            label={ui(language, 'statusClub')}
            value={career.club ? career.club.name : ui(language, 'statusFreeAgent')}
            sub={clubTier?.label}
          />
          <Info label={ui(language, 'statusWage')} value={formatMoney(career.wage)} sub={ui(language, 'statusPerYear')} />
          <Info label={ui(language, 'statusValue')} value={formatMoney(career.marketValue)} />
          <Info label={ui(language, 'statusCaps')} value={`${career.caps}`} sub={`${career.capGoals} ${ui(language, 'statusGoals')}`} />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:w-64 sm:grid-cols-1">
          <Meter label={ui(language, 'statusMorale')} value={career.morale} />
          <Meter label={ui(language, 'statusFitness')} value={career.fitness} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-ink-500">{label}</div>
      <div className="truncate font-medium text-ink-100">{value}</div>
      {sub && <div className="text-[11px] text-ink-500">{sub}</div>}
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const color = value >= 60 ? '#8fd0a6' : value >= 35 ? '#e8b94a' : '#e48a8a';
  return (
    <div>
      <div className="flex justify-between text-[11px] text-ink-500">
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="mt-0.5">
        <SegmentedBar value={value} segments={14} color={color} />
      </div>
    </div>
  );
}
