import { useEffect, useRef, useState } from 'react';
import type { PlayerState } from '../../engine/types';
import { overallRating } from '../../engine/types';
import { resolveClubTier } from '../../data/clubs';
import { getCountry } from '../../data/countries';
import { getPosition } from '../../data/positions';
import { formatMoney } from '../../engine/util';
import CountryFlag from '../ui/CountryFlag';

export default function ClubStatusBar({ career }: { career: PlayerState }) {
  const country = getCountry(career.countryCode);
  const clubTier = career.club ? resolveClubTier(career.club) : null;
  const overall = overallRating(career.attributes, getPosition(career.positionCode).weights);

  const prevOverallRef = useRef(overall);
  const [delta, setDelta] = useState(0);
  useEffect(() => {
    const diff = Math.round((overall - prevOverallRef.current) * 10) / 10;
    if (diff !== 0) setDelta(diff);
    prevOverallRef.current = overall;
  }, [overall]);

  return (
    <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full border border-gold-500/40 bg-pitch-800 text-xl">
          <CountryFlag code={career.countryCode} showCode={false} />
        </div>
        <div>
          <div className="font-display text-lg leading-tight text-ink-100">
            {career.firstName} {career.lastName}
            {career.captain && <span className="ml-1.5 text-gold-400">©</span>}
          </div>
          <div className="text-xs text-ink-400">
            {career.age} ans · Saison {career.season} · {country.name}
          </div>
        </div>
        <div className="ml-2 flex flex-col items-center rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 py-1">
          <span className="text-[9px] uppercase tracking-wide text-gold-400/80">Note</span>
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
        <Info label="Club" value={career.club ? career.club.name : 'Libre'} sub={clubTier?.label} />
        <Info label="Salaire" value={formatMoney(career.wage)} sub="par an" />
        <Info label="Valeur" value={formatMoney(career.marketValue)} />
        <Info label="Sélections" value={`${career.caps}`} sub={`${career.capGoals} buts`} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:w-64 sm:grid-cols-1">
        <Meter label="Moral" value={career.morale} />
        <Meter label="Forme" value={career.fitness} />
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
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
