'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { LeaderboardRow } from '@/data/types';
import { formatPrice, formatPriceTick, formatScore } from '@/lib/format';

const VIEW = { width: 880, height: 470 };
const PAD = { top: 20, right: 28, bottom: 52, left: 60 };
const PLOT = {
  x: PAD.left,
  y: PAD.top,
  width: VIEW.width - PAD.left - PAD.right,
  height: VIEW.height - PAD.top - PAD.bottom,
};

interface Point {
  slug: string;
  name: string;
  provider: string;
  cost: number;
  quality: number;
  onFront: boolean;
  cx: number;
  cy: number;
}

/** Graduations « rondes » sur une échelle logarithmique : 1, 2, 5, 10, 20… */
function logTicks(min: number, max: number): number[] {
  const ticks: number[] = [];
  const startExp = Math.floor(Math.log10(min));
  const endExp = Math.ceil(Math.log10(max));
  for (let exp = startExp; exp <= endExp; exp += 1) {
    for (const mult of [1, 2, 5]) {
      const value = mult * 10 ** exp;
      if (value >= min && value <= max) ticks.push(value);
    }
  }
  return ticks;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PlacedLabel extends Box {
  slug: string;
  text: string;
  anchor: 'start' | 'middle' | 'end';
  textX: number;
  baseline: number;
}

const LABEL_HEIGHT = 15;
const CHAR_WIDTH = 6.3; // approximation à 12px dans la sans du système

function overlaps(a: Box, b: Box, padding = 3): boolean {
  return (
    a.x < b.x + b.width + padding &&
    a.x + a.width + padding > b.x &&
    a.y < b.y + b.height + padding &&
    a.y + a.height + padding > b.y
  );
}

/**
 * Place les étiquettes de la frontière de Pareto sans chevauchement : on essaie
 * dessus, dessous, puis à droite et à gauche du point, et on s'écarte
 * progressivement. Empiler les étiquettes en les détachant de leur point serait
 * pire que pas d'étiquette du tout.
 */
function placeLabels(front: Point[], all: Point[]): PlacedLabel[] {
  const obstacles: Box[] = all.map((p) => ({
    x: p.cx - 9,
    y: p.cy - 9,
    width: 18,
    height: 18,
  }));
  const placed: PlacedLabel[] = [];

  for (const point of [...front].sort((a, b) => a.cx - b.cx)) {
    const width = point.name.length * CHAR_WIDTH + 4;
    const candidates: { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' }[] = [
      { dx: 0, dy: -14, anchor: 'middle' },
      { dx: 0, dy: 20, anchor: 'middle' },
      { dx: 12, dy: 0, anchor: 'start' },
      { dx: -12, dy: 0, anchor: 'end' },
      { dx: 12, dy: -16, anchor: 'start' },
      { dx: -12, dy: -16, anchor: 'end' },
      { dx: 12, dy: 18, anchor: 'start' },
      { dx: -12, dy: 18, anchor: 'end' },
      { dx: 0, dy: -30, anchor: 'middle' },
      { dx: 0, dy: 36, anchor: 'middle' },
      { dx: 14, dy: -32, anchor: 'start' },
      { dx: -14, dy: 34, anchor: 'end' },
    ];

    let chosen: PlacedLabel | null = null;
    for (const candidate of candidates) {
      const textX = point.cx + candidate.dx;
      const left =
        candidate.anchor === 'middle'
          ? textX - width / 2
          : candidate.anchor === 'start'
            ? textX
            : textX - width;
      // Une étiquette qui déborde du cadre serait rognée : on écarte la position.
      if (left < PLOT.x - 4 || left + width > PLOT.x + PLOT.width + 4) continue;

      const box: Box = {
        x: left,
        y: point.cy + candidate.dy - LABEL_HEIGHT / 2,
        width,
        height: LABEL_HEIGHT,
      };
      const clash =
        obstacles.some((o) => overlaps(box, o)) || placed.some((p) => overlaps(box, p));
      if (clash) continue;

      chosen = {
        ...box,
        slug: point.slug,
        text: point.name,
        anchor: candidate.anchor,
        textX,
        baseline: point.cy + candidate.dy + 4,
      };
      break;
    }

    if (chosen) {
      placed.push(chosen);
      obstacles.push(chosen);
    }
  }

  return placed;
}

export function QualityCostScatter({
  rows,
  excludedCount,
  excludedReason,
}: {
  rows: LeaderboardRow[];
  excludedCount: number;
  excludedReason: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<Point | null>(null);

  const { points, xTicks, yTicks, labels } = useMemo(() => {
    const usable = rows.filter(
      (r) => r.quality !== null && r.blendedCost !== null && r.blendedCost > 0,
    );

    const costs = usable.map((r) => r.blendedCost as number);
    const qualities = usable.map((r) => r.quality as number);
    const minCost = Math.min(...costs) * 0.7;
    const maxCost = Math.max(...costs) * 1.45;
    const minQ = Math.max(0, Math.floor((Math.min(...qualities) - 6) / 10) * 10);
    const maxQ = Math.min(100, Math.ceil((Math.max(...qualities) + 4) / 10) * 10);

    const logMin = Math.log10(minCost);
    const logMax = Math.log10(maxCost);
    const toX = (cost: number) =>
      PLOT.x + ((Math.log10(cost) - logMin) / (logMax - logMin)) * PLOT.width;
    const toY = (quality: number) =>
      PLOT.y + PLOT.height - ((quality - minQ) / (maxQ - minQ)) * PLOT.height;

    const built: Point[] = usable.map((row) => {
      const cost = row.blendedCost as number;
      const quality = row.quality as number;
      return {
        slug: row.model.slug,
        name: row.model.name,
        provider: row.provider.name,
        cost,
        quality,
        onFront: row.onParetoFront,
        cx: toX(cost),
        cy: toY(quality),
      };
    });

    const yStep = maxQ - minQ > 40 ? 10 : 5;
    const ys: { value: number; y: number }[] = [];
    for (let v = minQ; v <= maxQ; v += yStep) ys.push({ value: v, y: toY(v) });

    return {
      points: built,
      xTicks: logTicks(minCost, maxCost).map((value) => ({ value, x: toX(value) })),
      yTicks: ys,
      labels: placeLabels(
        built.filter((p) => p.onFront),
        built,
      ),
    };
  }, [rows]);

  /** Point le plus proche du pointeur — un nuage dense ne se survole pas au pixel. */
  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * VIEW.width;
    const py = ((event.clientY - box.top) / box.height) * VIEW.height;

    let nearest: Point | null = null;
    let bestDistance = Infinity;
    for (const point of points) {
      const distance = (point.cx - px) ** 2 + (point.cy - py) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = point;
      }
    }
    // ~48px dans le repère du viewBox : le pointeur doit être le plus proche,
    // pas pile sur la pastille.
    setActive(bestDistance <= 48 ** 2 ? nearest : null);
  }

  const frontPoints = points.filter((p) => p.onFront);

  return (
    <figure className="rounded-lg border border-hairline bg-surface p-4 sm:p-6">
      <figcaption className="mb-1 text-base font-semibold text-ink">
        Qualité contre coût
      </figcaption>
      <p className="mb-4 max-w-2xl text-sm text-ink-secondary">
        Indice de qualité composite en ordonnée, coût mixte en abscisse (échelle
        logarithmique). Les modèles nommés forment la frontière de Pareto : aucun autre
        modèle n&apos;est à la fois meilleur et moins cher.
      </p>

      {/* Légende — deux catégories, donc toujours présente. */}
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-secondary">
        <span className="flex items-center gap-2">
          <svg width="12" height="12" aria-hidden="true">
            <circle cx="6" cy="6" r="5" fill="var(--series-1)" />
          </svg>
          Frontière de Pareto
        </span>
        <span className="flex items-center gap-2">
          <svg width="12" height="12" aria-hidden="true">
            <circle cx="6" cy="6" r="5" fill="var(--text-muted)" />
          </svg>
          Dominé
        </span>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
          className="w-full"
          role="img"
          aria-label="Nuage de points qualité contre coût. Les valeurs exactes sont dans le tableau du classement."
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setActive(null)}
        >
          {/* Grille — trait plein d'un cran, jamais pointillé. */}
          {yTicks.map((tick) => (
            <line
              key={`gy-${tick.value}`}
              x1={PLOT.x}
              x2={PLOT.x + PLOT.width}
              y1={tick.y}
              y2={tick.y}
              stroke="var(--grid)"
              strokeWidth={1}
            />
          ))}
          {xTicks.map((tick) => (
            <line
              key={`gx-${tick.value}`}
              x1={tick.x}
              x2={tick.x}
              y1={PLOT.y}
              y2={PLOT.y + PLOT.height}
              stroke="var(--grid)"
              strokeWidth={1}
            />
          ))}

          {/* Axes */}
          <line
            x1={PLOT.x}
            x2={PLOT.x + PLOT.width}
            y1={PLOT.y + PLOT.height}
            y2={PLOT.y + PLOT.height}
            stroke="var(--axis)"
            strokeWidth={1}
          />
          <line
            x1={PLOT.x}
            x2={PLOT.x}
            y1={PLOT.y}
            y2={PLOT.y + PLOT.height}
            stroke="var(--axis)"
            strokeWidth={1}
          />

          {yTicks.map((tick) => (
            <text
              key={`ty-${tick.value}`}
              x={PLOT.x - 10}
              y={tick.y + 4}
              textAnchor="end"
              className="tnum"
              fontSize={12}
              fill="var(--text-muted)"
            >
              {tick.value}
            </text>
          ))}
          {xTicks.map((tick) => (
            <text
              key={`tx-${tick.value}`}
              x={tick.x}
              y={PLOT.y + PLOT.height + 20}
              textAnchor="middle"
              className="tnum"
              fontSize={12}
              fill="var(--text-muted)"
            >
              {formatPriceTick(tick.value)}
            </text>
          ))}

          <text
            x={PLOT.x + PLOT.width / 2}
            y={VIEW.height - 8}
            textAnchor="middle"
            fontSize={12}
            fill="var(--text-secondary)"
          >
            Coût mixte — USD par million de tokens (échelle log)
          </text>
          <text
            transform={`translate(16 ${PLOT.y + PLOT.height / 2}) rotate(-90)`}
            textAnchor="middle"
            fontSize={12}
            fill="var(--text-secondary)"
          >
            Indice de qualité
          </text>

          {/* Points dominés d'abord, pour que la frontière passe au-dessus. */}
          {points
            .filter((p) => !p.onFront)
            .map((point) => (
              <circle
                key={point.slug}
                cx={point.cx}
                cy={point.cy}
                r={5}
                fill="var(--text-muted)"
                stroke="var(--surface)"
                strokeWidth={2}
              />
            ))}
          {frontPoints.map((point) => (
            <circle
              key={point.slug}
              cx={point.cx}
              cy={point.cy}
              r={6}
              fill="var(--series-1)"
              stroke="var(--surface)"
              strokeWidth={2}
            />
          ))}

          {/* Étiquettes directes sur la seule frontière, positionnées sans
              chevauchement : jamais une valeur sur chaque point. */}
          {labels.map((label) => (
            <text
              key={`label-${label.slug}`}
              x={label.textX}
              y={label.baseline}
              textAnchor={label.anchor}
              fontSize={12}
              fill="var(--text-primary)"
            >
              {label.text}
            </text>
          ))}

          {/* Cibles clavier : le focus montre la même chose que le survol. */}
          {points.map((point) => (
            <circle
              key={`hit-${point.slug}`}
              cx={point.cx}
              cy={point.cy}
              r={14}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${point.name}, qualité ${formatScore(point.quality)}, ${formatPrice(point.cost)} par million de tokens`}
              onFocus={() => setActive(point)}
              onBlur={() => setActive(null)}
              className="outline-none focus-visible:stroke-[var(--series-1)] focus-visible:[stroke-width:2]"
            />
          ))}
        </svg>

        {active ? (
          (() => {
            // L'infobulle bascule sous le point quand celui-ci est haut, et se
            // recale horizontalement près des bords : elle ne doit jamais sortir
            // de la carte.
            const below = active.cy < VIEW.height * 0.3;
            const ratioX = active.cx / VIEW.width;
            const shiftX = ratioX > 0.78 ? '-88%' : ratioX < 0.14 ? '-12%' : '-50%';
            const offsetY = below ? active.cy + 16 : active.cy - 14;
            return (
              <div
                role="status"
                className="pointer-events-none absolute z-10 min-w-44 rounded-md border border-hairline bg-surface px-3 py-2 shadow-lg"
                style={{
                  left: `${ratioX * 100}%`,
                  top: `${(offsetY / VIEW.height) * 100}%`,
                  transform: `translate(${shiftX}, ${below ? '0' : '-100%'})`,
                }}
              >
                <p className="text-sm font-semibold text-ink">{active.name}</p>
                <p className="text-xs text-ink-muted">{active.provider}</p>
                <dl className="mt-1.5 space-y-0.5 text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-secondary">Qualité</dt>
                    <dd className="tnum font-semibold text-ink">
                      {formatScore(active.quality)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-secondary">Coût / M</dt>
                    <dd className="tnum font-semibold text-ink">{formatPrice(active.cost)}</dd>
                  </div>
                </dl>
              </div>
            );
          })()
        ) : null}
      </div>

      {/* Rien n'est masqué en silence : ce qui n'a pas pu être étiqueté est dit. */}
      {frontPoints.length > labels.length ? (
        <p className="mt-4 text-sm text-ink-muted">
          {frontPoints.length - labels.length} point
          {frontPoints.length - labels.length > 1 ? 's' : ''}
          {' de la frontière n’a pas pu être étiqueté sans chevauchement — le badge '}
          « Pareto » du tableau les identifie.
        </p>
      ) : null}

      {excludedCount > 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          {excludedCount} modèle{excludedCount > 1 ? 's' : ''} absent
          {excludedCount > 1 ? 's' : ''} du graphique : {excludedReason} Ils restent listés
          dans le tableau ci-dessous.
        </p>
      ) : null}

      <p className="mt-2 text-sm text-ink-muted">
        <Link href="/methodologie" className="underline underline-offset-2 hover:text-ink">
          Comment l&apos;indice et le coût mixte sont calculés
        </Link>
      </p>
    </figure>
  );
}
