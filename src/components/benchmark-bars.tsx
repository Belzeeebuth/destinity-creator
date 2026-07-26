'use client';

import { useState } from 'react';
import { BENCHMARKS, CATEGORY_LABELS } from '@/data/benchmarks';
import type { Score } from '@/data/types';
import { formatScore } from '@/lib/format';

const ROW_HEIGHT = 34;
// Le SVG est mis à l'échelle à l'affichage : 16 dans le viewBox rend ~22px,
// sous le plafond de 24px. La bande garde ainsi de l'air.
const BAR_HEIGHT = 16;
const LABEL_WIDTH = 168;
const VALUE_WIDTH = 52;
const RADIUS = 4;

/** Barre horizontale : extrémité data arrondie, base carrée sur la ligne zéro. */
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

export function BenchmarkBars({
  scores,
  title,
}: {
  scores: Record<string, Score | undefined>;
  title: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const rows = BENCHMARKS.map((benchmark) => ({
    benchmark,
    score: scores[benchmark.id],
  }));

  const viewWidth = 720;
  const plotX = LABEL_WIDTH;
  const plotWidth = viewWidth - LABEL_WIDTH - VALUE_WIDTH;
  const viewHeight = rows.length * ROW_HEIGHT + 28;
  const ticks = [0, 25, 50, 75, 100];
  const toX = (value: number) => plotX + (value / 100) * plotWidth;

  const active = rows.find((r) => r.benchmark.id === hovered);

  return (
    <figure className="rounded-lg border border-hairline bg-surface p-4 sm:p-6">
      {/* Une seule série : le titre dit ce qui est tracé, pas de boîte de légende. */}
      <figcaption className="mb-1 text-base font-semibold text-ink">{title}</figcaption>
      <p className="mb-4 text-sm text-ink-secondary">
        Score par benchmark, normalisé sur 100. Les suites non évaluées sont omises.
      </p>

      <div className="relative">
        <svg
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          className="w-full"
          role="img"
          aria-label={`${title} : scores par benchmark. Les valeurs exactes sont affichées au bout de chaque barre.`}
        >
          {ticks.map((tick) => (
            <line
              key={tick}
              x1={toX(tick)}
              x2={toX(tick)}
              y1={0}
              y2={rows.length * ROW_HEIGHT}
              stroke={tick === 0 ? 'var(--axis)' : 'var(--grid)'}
              strokeWidth={1}
            />
          ))}

          {rows.map((row, index) => {
            const y = index * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;
            const value = row.score?.value ?? null;
            const isHovered = hovered === row.benchmark.id;
            return (
              <g
                key={row.benchmark.id}
                onPointerEnter={() => setHovered(row.benchmark.id)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(row.benchmark.id)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
                role="button"
                aria-label={`${row.benchmark.name} : ${value === null ? 'non évalué' : formatScore(value)}`}
                className="outline-none"
              >
                {/* Cible de survol pleine largeur : bien plus grande que la barre. */}
                <rect
                  x={0}
                  y={index * ROW_HEIGHT}
                  width={viewWidth}
                  height={ROW_HEIGHT}
                  fill={isHovered ? 'var(--wash)' : 'transparent'}
                />
                <text
                  x={LABEL_WIDTH - 12}
                  y={index * ROW_HEIGHT + ROW_HEIGHT / 2 + 4}
                  textAnchor="end"
                  fontSize={12}
                  fill="var(--text-secondary)"
                >
                  {row.benchmark.name}
                </text>
                {value === null ? (
                  <text
                    x={plotX + 8}
                    y={index * ROW_HEIGHT + ROW_HEIGHT / 2 + 4}
                    fontSize={12}
                    fill="var(--text-muted)"
                  >
                    non évalué
                  </text>
                ) : (
                  <>
                    <path
                      d={barPath(plotX, y, (value / 100) * plotWidth, BAR_HEIGHT)}
                      fill="var(--series-1)"
                      opacity={isHovered ? 0.85 : 1}
                    />
                    <text
                      x={toX(value) + 8}
                      y={index * ROW_HEIGHT + ROW_HEIGHT / 2 + 4}
                      fontSize={12}
                      className="tnum"
                      fill="var(--text-primary)"
                    >
                      {formatScore(value)}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {ticks.map((tick) => (
            <text
              key={`t-${tick}`}
              x={toX(tick)}
              y={rows.length * ROW_HEIGHT + 18}
              textAnchor="middle"
              fontSize={11}
              className="tnum"
              fill="var(--text-muted)"
            >
              {tick}
            </text>
          ))}
        </svg>
      </div>

      {/* Le survol enrichit ; il ne conditionne rien — les valeurs sont déjà
          au bout des barres. */}
      <p className="mt-3 min-h-10 text-sm text-ink-secondary" role="status">
        {active ? (
          <>
            <span className="font-medium text-ink">{active.benchmark.name}</span>{' '}
            <span className="text-ink-muted">
              ({CATEGORY_LABELS[active.benchmark.category]})
            </span>{' '}
            — {active.benchmark.description}
          </>
        ) : (
          <span className="text-ink-muted">
            Survolez une barre pour lire ce que le benchmark mesure.
          </span>
        )}
      </p>
    </figure>
  );
}
