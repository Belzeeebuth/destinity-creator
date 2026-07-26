'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { QualityCostScatter } from './quality-cost-scatter';
import { StatTile } from './stat-tile';
import { BENCHMARKS } from '@/data/benchmarks';
import { PROVIDER_LIST } from '@/data/models';
import type { LeaderboardRow, ProviderId } from '@/data/types';
import { formatPrice, formatScore, formatTokens, NA } from '@/lib/format';

type SortKey = 'quality' | 'cost' | 'input' | 'output' | 'context' | 'name';
type SortDirection = 'asc' | 'desc';

const DEFAULT_DIRECTION: Record<SortKey, SortDirection> = {
  quality: 'desc',
  cost: 'asc',
  input: 'asc',
  output: 'asc',
  context: 'desc',
  name: 'asc',
};

/** `null` en dernier quel que soit le sens du tri. */
function compareNullable(a: number | null, b: number | null, direction: SortDirection) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === 'asc' ? a - b : b - a;
}

export function LeaderboardView({ rows }: { rows: LeaderboardRow[] }) {
  const [providers, setProviders] = useState<Set<ProviderId>>(new Set());
  const [openWeightsOnly, setOpenWeightsOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('quality');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (providers.size > 0 && !providers.has(row.model.provider)) return false;
      if (openWeightsOnly && !row.model.capabilities.openWeights) return false;
      if (needle && !`${row.model.name} ${row.provider.name}`.toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [rows, providers, openWeightsOnly, query]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return sortDirection === 'asc'
            ? a.model.name.localeCompare(b.model.name, 'fr')
            : b.model.name.localeCompare(a.model.name, 'fr');
        case 'cost':
          return compareNullable(a.blendedCost, b.blendedCost, sortDirection);
        case 'input':
          return compareNullable(a.model.pricing.input, b.model.pricing.input, sortDirection);
        case 'output':
          return compareNullable(a.model.pricing.output, b.model.pricing.output, sortDirection);
        case 'context':
          return compareNullable(a.model.contextWindow, b.model.contextWindow, sortDirection);
        case 'quality':
        default:
          return compareNullable(a.quality, b.quality, sortDirection);
      }
    });
    return copy;
  }, [filtered, sortKey, sortDirection]);

  const excluded = useMemo(() => {
    const selfHosted = filtered.filter((r) => r.model.selfHosted).length;
    const noPrice = filtered.filter(
      (r) => !r.model.selfHosted && r.blendedCost === null,
    ).length;
    const noQuality = filtered.filter(
      (r) => !r.model.selfHosted && r.blendedCost !== null && r.quality === null,
    ).length;
    const parts: string[] = [];
    if (selfHosted > 0)
      parts.push(`${selfHosted} auto-hébergé${selfHosted > 1 ? 's' : ''} (coût d'infrastructure, pas de tarif au token)`);
    if (noPrice > 0) parts.push(`${noPrice} sans tarif relevé`);
    if (noQuality > 0) parts.push(`${noQuality} sans score`);
    return { count: selfHosted + noPrice + noQuality, reason: `${parts.join(', ')}.` };
  }, [filtered]);

  const scored = filtered.filter((r) => r.quality !== null && r.blendedCost !== null);
  const best = scored.length
    ? scored.reduce((acc, row) => ((row.quality ?? 0) > (acc.quality ?? 0) ? row : acc))
    : null;
  const cheapestOnFront = filtered
    .filter((r) => r.onParetoFront && r.blendedCost !== null)
    .sort((a, b) => (a.blendedCost as number) - (b.blendedCost as number))[0];

  function toggleProvider(id: ProviderId) {
    setProviders((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function sortBy(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection(DEFAULT_DIRECTION[key]);
  }

  function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (key !== sortKey) return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  return (
    <div className="space-y-8">
      {/* Une seule rangée de filtres, au-dessus de tout ce qu'elle cadre. */}
      <section
        aria-label="Filtres"
        className="flex flex-wrap items-center gap-x-3 gap-y-3 rounded-lg border border-hairline bg-surface p-4"
      >
        <label className="flex-1 min-w-52">
          <span className="sr-only">Rechercher un modèle</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un modèle…"
            className="w-full rounded-md border border-hairline bg-plane px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted focus:border-[var(--series-1)] focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          {PROVIDER_LIST.map((provider) => {
            const selected = providers.has(provider.id);
            return (
              <button
                key={provider.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleProvider(provider.id)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  selected
                    ? 'border-[var(--series-1)] bg-[var(--series-1)] text-white'
                    : 'border-hairline text-ink-secondary hover:bg-wash hover:text-ink'
                }`}
              >
                {provider.name}
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-secondary">
          <input
            type="checkbox"
            checked={openWeightsOnly}
            onChange={(event) => setOpenWeightsOnly(event.target.checked)}
            className="size-4 accent-[var(--series-1)]"
          />
          Poids ouverts
        </label>

        {(providers.size > 0 || openWeightsOnly || query) && (
          <button
            type="button"
            onClick={() => {
              setProviders(new Set());
              setOpenWeightsOnly(false);
              setQuery('');
            }}
            className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
          >
            Réinitialiser
          </button>
        )}
      </section>

      <section aria-label="Chiffres clés" className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Modèles affichés" value={String(filtered.length)} />
        <StatTile
          label="Meilleur indice de qualité"
          value={best ? formatScore(best.quality) : NA}
          detail={best?.model.name}
        />
        <StatTile
          label="Pareto le moins cher"
          value={cheapestOnFront ? formatPrice(cheapestOnFront.blendedCost) : NA}
          detail={cheapestOnFront?.model.name}
        />
      </section>

      {scored.length > 1 ? (
        <QualityCostScatter
          rows={filtered}
          excludedCount={excluded.count}
          excludedReason={excluded.reason}
        />
      ) : null}

      <section aria-label="Classement">
        <h2 className="mb-3 text-base font-semibold text-ink">Tous les modèles</h2>
        <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
          <table className="w-full min-w-4xl border-collapse text-sm">
            <caption className="sr-only">
              Modèles de langage classés par indice de qualité, avec tarifs et fenêtre de
              contexte. Colonnes triables.
            </caption>
            <thead>
              <tr className="border-b border-hairline text-left">
                <Th onClick={() => sortBy('name')} sort={ariaSort('name')}>
                  Modèle
                </Th>
                <Th onClick={() => sortBy('quality')} sort={ariaSort('quality')} numeric>
                  Qualité
                </Th>
                <Th onClick={() => sortBy('cost')} sort={ariaSort('cost')} numeric>
                  Coût mixte
                </Th>
                <Th onClick={() => sortBy('input')} sort={ariaSort('input')} numeric>
                  Entrée / M
                </Th>
                <Th onClick={() => sortBy('output')} sort={ariaSort('output')} numeric>
                  Sortie / M
                </Th>
                <Th onClick={() => sortBy('context')} sort={ariaSort('context')} numeric>
                  Contexte
                </Th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium text-ink-secondary">
                  Couverture
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const covered = BENCHMARKS.filter((b) => row.scores[b.id]).length;
                return (
                  <tr
                    key={row.model.slug}
                    className="border-b border-hairline last:border-0 hover:bg-wash"
                  >
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/modeles/${row.model.slug}`}
                        className="font-medium text-ink underline-offset-2 hover:underline"
                      >
                        {row.model.name}
                      </Link>
                      <span className="ml-2 text-xs text-ink-muted">{row.provider.name}</span>
                      {row.onParetoFront ? (
                        <span className="ml-2 rounded-full border border-[var(--series-1)] px-1.5 py-0.5 text-[11px] text-[var(--series-1)]">
                          Pareto
                        </span>
                      ) : null}
                      {row.model.selfHosted ? (
                        <span className="ml-2 rounded-full border border-hairline px-1.5 py-0.5 text-[11px] text-ink-muted">
                          auto-hébergé
                        </span>
                      ) : null}
                    </td>
                    <td className="tnum px-3 py-2.5 text-right font-semibold text-ink">
                      {formatScore(row.quality)}
                    </td>
                    <td className="tnum px-3 py-2.5 text-right text-ink">
                      {formatPrice(row.blendedCost)}
                    </td>
                    <td className="tnum px-3 py-2.5 text-right text-ink-secondary">
                      {formatPrice(row.model.pricing.input)}
                    </td>
                    <td className="tnum px-3 py-2.5 text-right text-ink-secondary">
                      {formatPrice(row.model.pricing.output)}
                    </td>
                    <td className="tnum px-3 py-2.5 text-right text-ink-secondary">
                      {formatTokens(row.model.contextWindow)}
                    </td>
                    <td className="tnum px-3 py-2.5 text-right text-ink-muted">
                      {covered}/{BENCHMARKS.length}
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-ink-muted">
                    Aucun modèle ne correspond à ces filtres.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Th({
  children,
  onClick,
  sort,
  numeric = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  sort: 'ascending' | 'descending' | 'none';
  numeric?: boolean;
}) {
  const arrow = sort === 'ascending' ? '▲' : sort === 'descending' ? '▼' : '';
  return (
    <th scope="col" aria-sort={sort} className={numeric ? 'text-right' : 'text-left'}>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-1 px-3 py-2.5 font-medium text-ink-secondary hover:text-ink ${
          numeric ? 'justify-end' : 'justify-start'
        }`}
      >
        {children}
        <span aria-hidden="true" className="text-[10px] text-ink-muted">
          {arrow}
        </span>
      </button>
    </th>
  );
}
