import { useMemo, useState } from 'react';
import { COUNTRIES, TIER_INFO, flagEmoji, type CountryTier } from '../../data/countries';
import { useGameStore } from '../../state/store';
import { L } from '../../i18n/language';
import { ui } from '../../i18n/ui';
import CountryFlag from '../ui/CountryFlag';

interface Props {
  value: string | null;
  onSelect: (code: string) => void;
}

const TIER_ORDER: CountryTier[] = ['S', 'A', 'B', 'C', 'D'];

export default function CountryStep({ value, onSelect }: Props) {
  const language = useGameStore((s) => s.language);
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<CountryTier | 'ALL'>('ALL');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COUNTRIES.filter((c) => {
      if (tierFilter !== 'ALL' && c.tier !== tierFilter) return false;
      const name = L(language, c.name, c.nameEn);
      if (q && !name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, tierFilter, language]);

  const selected = COUNTRIES.find((c) => c.code === value);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-2xl text-ink-100">{ui(language, 'countryStepTitle')}</h2>
        <p className="mt-1 text-sm text-ink-300">{ui(language, 'countryStepSubtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ui(language, 'searchCountry')}
          className="flex-1 min-w-[180px] rounded-lg border border-white/10 bg-pitch-900/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none"
        />
        <button
          onClick={() => setTierFilter('ALL')}
          className={`rounded-full px-3 py-1.5 text-xs ${tierFilter === 'ALL' ? 'bg-gold-500/20 text-gold-400' : 'btn-outline'}`}
        >
          {ui(language, 'filterAll')}
        </button>
        {TIER_ORDER.map((tier) => (
          <button
            key={tier}
            onClick={() => setTierFilter(tier)}
            className={`rounded-full px-3 py-1.5 text-xs ${tierFilter === tier ? 'bg-gold-500/20 text-gold-400' : 'btn-outline'}`}
            style={tierFilter === tier ? { color: TIER_INFO[tier].color } : undefined}
          >
            {L(language, TIER_INFO[tier].label, TIER_INFO[tier].labelEn)}
          </button>
        ))}
      </div>

      {selected && (
        <div className="card p-4 text-sm">
          <div className="flex items-center gap-2">
            <CountryFlag code={selected.code} size="lg" />
            <span className="font-display text-lg text-ink-100">{L(language, selected.name, selected.nameEn)}</span>
            <span
              className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ color: TIER_INFO[selected.tier].color, backgroundColor: `${TIER_INFO[selected.tier].color}22` }}
            >
              {L(language, TIER_INFO[selected.tier].difficulty, TIER_INFO[selected.tier].difficultyEn)}
            </span>
          </div>
          <p className="mt-2 text-ink-300">{L(language, TIER_INFO[selected.tier].description, TIER_INFO[selected.tier].descriptionEn)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-300 sm:grid-cols-5">
            <Stat label={ui(language, 'statCompetition')} value={selected.competition} />
            <Stat label={ui(language, 'statInfrastructure')} value={selected.infrastructure} />
            <Stat label={ui(language, 'statScouting')} value={selected.scouting} />
            <Stat label={ui(language, 'statLeague')} value={selected.leagueStrength} />
            <Stat label={ui(language, 'statNationalTeam')} value={selected.nationalTeamAccess} />
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
              <span className="flex-1 truncate">{L(language, country.name, country.nameEn)}</span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ color: TIER_INFO[country.tier].color }}
              >
                {country.tier}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="col-span-full py-6 text-center text-sm text-ink-500">{ui(language, 'noCountryMatch')}</p>}
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
