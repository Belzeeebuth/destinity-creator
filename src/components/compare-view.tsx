'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BENCHMARKS } from '@/data/benchmarks';
import type { LeaderboardRow } from '@/data/types';
import { formatPrice, formatScore, formatTokens } from '@/lib/format';

/**
 * Trois modèles au maximum : c'est la limite au-delà de laquelle les couleurs
 * de séries cessent de se distinguer sous déficience de vision des couleurs
 * quand toutes les paires sont à l'écran en même temps.
 */
const MAX_SELECTION = 3;
const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];

const BAR_HEIGHT = 16;
const BAR_GAP = 2; // écart de surface, jamais un contour
const ROW_PADDING = 20;
const LABEL_WIDTH = 168;
const VALUE_WIDTH = 56;
const RADIUS = 4;

function barPath(x0: number, y: number, width: number, height: number) {
  const r = Math.min(RADIUS, width);
  if (width <= 0) return '';
  const x1 = x0 + width;
  return [
    `M ${x0} ${y}`,
    `H ${x1 - r}`,
    `A ${r} ${r} 0 0 1 ${x1} ${y + r}`,
    `V ${y + height - r}`,
    `A ${r} ${r} 0 0 1 ${x1 - r} ${y + height}`,
    `H ${x0}`,
    'Z',
  ].join(' ');
}

export function CompareView({
  rows,
  initialSelection,
}: {
  rows: LeaderboardRow[];
  initialSelection: string[];
}) {
  const [selected, setSelected] = useState<string[]>(() =>
    initialSelection.slice(0, MAX_SELECTION),
  );
  const [hovered, setHovered] = useState<string | null>(null);

  const chosen = selected
    .map((slug) => rows.find((r) => r.model.slug === slug))
    .filter((r): r is LeaderboardRow => Boolean(r));

  function toggle(slug: string) {
    setSelected((current) => {
      if (current.includes(slug)) return current.filter((s) => s !== slug);
      if (current.length >= MAX_SELECTION) return current;
      return [...current, slug];
    });
  }

  const groupHeight = chosen.length * BAR_HEIGHT + Math.max(0, chosen.length - 1) * BAR_GAP;
  const rowHeight = groupHeight + ROW_PADDING;
  const viewWidth = 760;
  const plotX = LABEL_WIDTH;
  const plotWidth = viewWidth - LABEL_WIDTH - VALUE_WIDTH;
  const viewHeight = BENCHMARKS.length * rowHeight + 28;
  const ticks = [0, 25, 50, 75, 100];
  const toX = (value: number) => plotX + (value / 100) * plotWidth;

  return (
    <div className="space-y-8">
      <section
        aria-label="Choix des modèles"
        className="rounded-lg border border-hairline bg-surface p-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">
            Sélection ({chosen.length}/{MAX_SELECTION})
          </h2>
          {chosen.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelected([])}
              className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
            >
              Tout désélectionner
            </button>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {rows.map((row) => {
            const index = selected.indexOf(row.model.slug);
            const isSelected = index >= 0;
            const full = !isSelected && selected.length >= MAX_SELECTION;
            return (
              <button
                key={row.model.slug}
                type="button"
                aria-pressed={isSelected}
                disabled={full}
                onClick={() => toggle(row.model.slug)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${
                  isSelected
                    ? 'border-ink text-ink'
                    : full
                      ? 'cursor-not-allowed border-hairline text-ink-muted opacity-50'
                      : 'border-hairline text-ink-secondary hover:bg-wash hover:text-ink'
                }`}
              >
                {isSelected ? (
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-full"
                    style={{ background: SERIES[index] }}
                  />
                ) : null}
                {row.model.name}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          Trois modèles au maximum : au-delà, les couleurs cessent d&apos;être distinguables
          de façon fiable sous déficience de vision des couleurs.
        </p>
      </section>

      {chosen.length === 0 ? (
        <p className="rounded-lg border border-hairline bg-surface p-8 text-center text-ink-muted">
          Choisissez au moins un modèle pour lancer la comparaison.
        </p>
      ) : (
        <>
          <figure className="rounded-lg border border-hairline bg-surface p-4 sm:p-6">
            <figcaption className="mb-1 text-base font-semibold text-ink">
              Scores par benchmark
            </figcaption>
            <p className="mb-4 text-sm text-ink-secondary">
              Scores normalisés sur 100. Les valeurs exactes sont dans le tableau plus bas.
            </p>

            {/* Légende toujours présente à partir de deux séries. */}
            <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-secondary">
              {chosen.map((row, index) => (
                <span key={row.model.slug} className="flex items-center gap-2">
                  <svg width="14" height="14" aria-hidden="true">
                    <rect width="14" height="14" rx="3" fill={SERIES[index]} />
                  </svg>
                  {row.model.name}
                </span>
              ))}
            </div>

            <svg
              viewBox={`0 0 ${viewWidth} ${viewHeight}`}
              className="w-full"
              role="img"
              aria-label="Comparaison des scores par benchmark. Les valeurs exactes sont dans le tableau qui suit."
            >
              {ticks.map((tick) => (
                <line
                  key={tick}
                  x1={toX(tick)}
                  x2={toX(tick)}
                  y1={0}
                  y2={BENCHMARKS.length * rowHeight}
                  stroke={tick === 0 ? 'var(--axis)' : 'var(--grid)'}
                  strokeWidth={1}
                />
              ))}

              {BENCHMARKS.map((benchmark, rowIndex) => {
                const top = rowIndex * rowHeight + ROW_PADDING / 2;
                const values = chosen.map((row) => row.scores[benchmark.id]?.value ?? null);
                const bestValue = Math.max(
                  ...values.map((v) => (v === null ? -Infinity : v)),
                );
                const isHovered = hovered === benchmark.id;
                return (
                  <g
                    key={benchmark.id}
                    onPointerEnter={() => setHovered(benchmark.id)}
                    onPointerLeave={() => setHovered(null)}
                    onFocus={() => setHovered(benchmark.id)}
                    onBlur={() => setHovered(null)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${benchmark.name} : ${chosen
                      .map(
                        (row, i) =>
                          `${row.model.name} ${values[i] === null ? 'non évalué' : formatScore(values[i])}`,
                      )
                      .join(', ')}`}
                    className="outline-none"
                  >
                    <rect
                      x={0}
                      y={rowIndex * rowHeight}
                      width={viewWidth}
                      height={rowHeight}
                      fill={isHovered ? 'var(--wash)' : 'transparent'}
                    />
                    <text
                      x={LABEL_WIDTH - 12}
                      y={rowIndex * rowHeight + rowHeight / 2 + 4}
                      textAnchor="end"
                      fontSize={12}
                      fill="var(--text-secondary)"
                    >
                      {benchmark.name}
                    </text>
                    {chosen.map((row, seriesIndex) => {
                      const value = values[seriesIndex];
                      const y = top + seriesIndex * (BAR_HEIGHT + BAR_GAP);
                      if (value === null) {
                        return (
                          <text
                            key={row.model.slug}
                            x={plotX + 8}
                            y={y + BAR_HEIGHT - 4}
                            fontSize={11}
                            fill="var(--text-muted)"
                          >
                            non évalué
                          </text>
                        );
                      }
                      return (
                        <g key={row.model.slug}>
                          <path
                            d={barPath(plotX, y, (value / 100) * plotWidth, BAR_HEIGHT)}
                            fill={SERIES[seriesIndex]}
                          />
                          {/* Étiquette directe sur le meilleur de chaque groupe
                              seulement : une valeur sur chaque barre serait illisible. */}
                          {value === bestValue ? (
                            <text
                              x={toX(value) + 8}
                              y={y + BAR_HEIGHT - 3}
                              fontSize={11}
                              className="tnum"
                              fill="var(--text-primary)"
                            >
                              {formatScore(value)}
                            </text>
                          ) : null}
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {ticks.map((tick) => (
                <text
                  key={`t-${tick}`}
                  x={toX(tick)}
                  y={BENCHMARKS.length * rowHeight + 18}
                  textAnchor="middle"
                  fontSize={11}
                  className="tnum"
                  fill="var(--text-muted)"
                >
                  {tick}
                </text>
              ))}
            </svg>
          </figure>

          <section aria-label="Comparaison détaillée">
            <h2 className="mb-3 text-base font-semibold text-ink">Fiche technique</h2>
            <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-hairline">
                    <th scope="col" className="px-3 py-2.5 text-left font-medium text-ink-secondary">
                      Critère
                    </th>
                    {chosen.map((row, index) => (
                      <th
                        key={row.model.slug}
                        scope="col"
                        className="px-3 py-2.5 text-right font-medium text-ink"
                      >
                        <span className="flex items-center justify-end gap-2">
                          <span
                            aria-hidden="true"
                            className="size-2.5 rounded-full"
                            style={{ background: SERIES[index] }}
                          />
                          <Link
                            href={`/modeles/${row.model.slug}`}
                            className="underline-offset-2 hover:underline"
                          >
                            {row.model.name}
                          </Link>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <SpecRow
                    label="Indice de qualité"
                    values={chosen.map((r) => formatScore(r.quality))}
                    strong
                  />
                  <SpecRow
                    label="Coût mixte / M tokens"
                    values={chosen.map((r) => formatPrice(r.blendedCost))}
                    strong
                  />
                  <SpecRow
                    label="Entrée / M tokens"
                    values={chosen.map((r) => formatPrice(r.model.pricing.input))}
                  />
                  <SpecRow
                    label="Sortie / M tokens"
                    values={chosen.map((r) => formatPrice(r.model.pricing.output))}
                  />
                  <SpecRow
                    label="Fenêtre de contexte"
                    values={chosen.map((r) => formatTokens(r.model.contextWindow))}
                  />
                  <SpecRow
                    label="Sortie maximale"
                    values={chosen.map((r) => formatTokens(r.model.maxOutput))}
                  />
                  <SpecRow
                    label="Vision"
                    values={chosen.map((r) => (r.model.capabilities.vision ? 'oui' : 'non'))}
                  />
                  <SpecRow
                    label="Raisonnement étendu"
                    values={chosen.map((r) => (r.model.capabilities.thinking ? 'oui' : 'non'))}
                  />
                  <SpecRow
                    label="Poids ouverts"
                    values={chosen.map((r) => (r.model.capabilities.openWeights ? 'oui' : 'non'))}
                  />
                  {BENCHMARKS.map((benchmark) => (
                    <SpecRow
                      key={benchmark.id}
                      label={benchmark.name}
                      values={chosen.map((r) => formatScore(r.scores[benchmark.id]?.value))}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SpecRow({
  label,
  values,
  strong = false,
}: {
  label: string;
  values: string[];
  strong?: boolean;
}) {
  return (
    <tr className="border-b border-hairline last:border-0">
      <th scope="row" className="px-3 py-2.5 text-left font-normal text-ink-secondary">
        {label}
      </th>
      {values.map((value, index) => (
        <td
          key={index}
          className={`tnum px-3 py-2.5 text-right ${strong ? 'font-semibold text-ink' : 'text-ink'}`}
        >
          {value}
        </td>
      ))}
    </tr>
  );
}
