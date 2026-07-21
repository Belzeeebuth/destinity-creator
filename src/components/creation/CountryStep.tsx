import { useMemo, useState } from 'react';
import { COUNTRIES, TIER_INFO, flagEmoji, type CountryTier } from '../../data/countries';
import CountryFlag from '../ui/CountryFlag';

interface Props {
  value: string | null;
  onSelect: (code: string) => void;
}

const TIER_ORDER: CountryTier[] = ['S', 'A', 'B', 'C', 'D'];

export default function CountryStep({ value, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<CountryTier | 'ALL'>('ALL');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COUNTRIES.filter((c) => {
      if (tierFilter !== 'ALL' && c.tier !== tierFilter) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, tierFilter]);

  const selected = COUNTRIES.find((c) => c.code === value);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-2xl text-ink-100">Choisis ton pays de départ</h2>
        <p className="mt-1 text-sm text-ink-300">
          Le pays détermine la difficulté de ta progression : concurrence pour percer, qualité des
          infrastructures, exposition aux recruteurs et facilité d'accès à la sélection nationale.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un pays..."
          className="flex-1 min-w-[180px] rounded-lg border border-white/10 bg-pitch-900/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none"
        />
        <button
          onClick={() => setTierFilter('ALL')}
          className={`rounded-full px-3 py-1.5 text-xs ${tierFilter === 'ALL' ? 'bg-gold-500/20 text-gold-400' : 'btn-outline'}`}
        >
          Tous
        </button>
        {TIER_ORDER.map((tier) => (
          <button
            key={tier}
            onClick={() => setTierFilter(tier)}
            className={`rounded-full px-3 py-1.5 text-xs ${tierFilter === tier ? 'bg-gold-500/20 text-gold-400' : 'btn-outline'}`}
            style={tierFilter === tier ? { color: TIER_INFO[tier].color } : undefined}
          >
            {TIER_INFO[tier].label}
          </button>
        ))}
      </div>

      {selected && (
        <div className="card p-4 text-sm">
          <div className="flex items-center gap-2">
            <CountryFlag code={selected.code} size="lg" />
            <span className="font-display text-lg text-ink-100">{selected.name}</span>
            <span
              className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ color: TIER_INFO[selected.tier].color, backgroundColor: `${TIER_INFO[selected.tier].color}22` }}
            >
              {TIER_INFO[selected.tier].difficulty}
            </span>
          </div>
          <p className="mt-2 text-ink-300">{TIER_INFO[selected.tier].description}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-300 sm:grid-cols-5">
            <Stat label="Concurrence" value={selected.competition} />
            <Stat label="Infrastructures" value={selected.infrastructure} />
            <Stat label="Recruteurs" value={selected.scouting} />
            <Stat label="Championnat" value={selected.leagueStrength} />
            <Stat label="Sélection nat." value={selected.nationalTeamAccess} />
          </div>
        </div>
      )}

      <div className="grid max-h-[420px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((country) => {
          const active = value === country.code;
          return (
            <button
              key={country.code}
              onClick={() => onSelect(country.code)}
              className={`choice-option flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                active
                  ? 'is-selected text-ink-100'
                  : 'border-white/10 bg-pitch-900/40 text-ink-300 hover:border-white/25 hover:text-ink-100'
              }`}
            >
              <span className="text-lg">{flagEmoji(country.code)}</span>
              <span className="flex-1 truncate">{country.name}</span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ color: TIER_INFO[country.tier].color }}
              >
                {country.tier}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="col-span-full py-6 text-center text-sm text-ink-500">Aucun pays ne correspond à ta recherche.</p>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white/5 px-2 py-1.5">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="font-semibold text-ink-100">{value}/10</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gold-500" style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  );
}
