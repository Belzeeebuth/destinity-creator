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
import { statTierColor } from '../ui/statColor';

export default function ClubStatusBar({ career }: { career: PlayerState }) {
  const language = useGameStore((s) => s.language);
  const country = getCountry(career.countryCode);
  const clubTier = career.club ? resolveClubTier(career.club, language) : null;
  const overall = overallRating(career.attributes, getPosition(career.positionCode).weights);
  const ratingColor = statTierColor(overall);

  const prevOverallRef = useRef(overall);
  const [delta, setDelta] = useState(0);
  useEffect(() => {
    const diff = Math.round((overall - prevOverallRef.current) * 10) / 10;
    if (diff !== 0) setDelta(diff);
    prevOverallRef.current = overall;
  }, [overall]);

  return (
    <div>
      <div className="panel-header-tab panel-header-tab--green">
        <CountryFlag code={career.countryCode} showCode={false} />
        <span>{career.firstName} {career.lastName}</span>
        {career.captain && <span className="text-gold-200">©</span>}
      </div>
      <div className="panel-retro rounded-tl-none">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex flex-col items-center rounded-sm border px-3 py-1"
              style={{ borderColor: `${ratingColor}80`, backgroundColor: `${ratingColor}18` }}
            >
              <span className="text-[9px] uppercase tracking-wide opacity-70" style={{ color: ratingColor }}>
                {ui(language, 'statusRating')}
              </span>
              <span className="font-display text-xl font-bold leading-none" style={{ color: ratingColor }}>
                {overall.toFixed(1)}
              </span>
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
            <div className="text-xs text-ink-400">
              {career.age} {ui(language, 'homeYearsOld')} · {ui(language, 'homeSeasonAge')} {career.season}
              <br />
              {L(language, country.name, country.nameEn)}
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

          <div className="grid grid-cols-2 gap-2 sm:w-56 sm:grid-cols-1">
            <Meter label={ui(language, 'statusMorale')} value={career.morale} />
            <Meter label={ui(language, 'statusFitness')} value={career.fitness} />
          </div>
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
  const color = statTierColor(value);
  return (
    <div>
      <div className="flex justify-between text-[11px] text-ink-500">
        <span>{label}</span>
        <span style={{ color }}>{Math.round(value)}</span>
      </div>
      <div className="mt-0.5">
        <SegmentedBar value={value} segments={20} color={color} />
      </div>
    </div>
  );
}
