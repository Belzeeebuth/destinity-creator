import type { SeasonRecord } from '../../engine/types';
import { useGameStore } from '../../state/store';
import { ui } from '../../i18n/ui';

interface Props {
  history: SeasonRecord[];
}

const WIDTH = 640;
const HEIGHT = 200;
const PAD_X = 36;
const PAD_Y = 24;

export default function OverallEvolutionChart({ history }: Props) {
  const language = useGameStore((s) => s.language);
  if (history.length < 2) return null;

  const values = history.map((h) => h.overall);
  const min = Math.max(0, Math.min(...values) - 4);
  const max = Math.min(99, Math.max(...values) + 4);
  const span = Math.max(1, max - min);

  const innerW = WIDTH - PAD_X * 2;
  const innerH = HEIGHT - PAD_Y * 2;

  const points = history.map((h, i) => {
    const x = PAD_X + (i / (history.length - 1)) * innerW;
    const y = PAD_Y + innerH - ((h.overall - min) / span) * innerH;
    return { x, y, h };
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${path} L ${points[points.length - 1].x.toFixed(1)} ${(PAD_Y + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(PAD_Y + innerH).toFixed(1)} Z`;

  const peakIndex = values.indexOf(Math.max(...values));
  const gridLines = 3;

  return (
    <div className="card p-5">
      <h2 className="font-display text-lg text-ink-100">{ui(language, 'overallEvolutionTitle')}</h2>
      <div className="mt-3 overflow-x-auto">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full min-w-[480px]" role="img" aria-label={ui(language, 'overallEvolutionAlt')}>
          {Array.from({ length: gridLines + 1 }).map((_, i) => {
            const y = PAD_Y + (innerH / gridLines) * i;
            const value = Math.round(max - (span / gridLines) * i);
            return (
              <g key={i}>
                <line x1={PAD_X} y1={y} x2={WIDTH - PAD_X} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                <text x={4} y={y + 4} fontSize={10} fill="#7c8b80">{value}</text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#overallGradient)" opacity={0.5} />
          <path d={path} fill="none" stroke="#e8b94a" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === peakIndex ? 4 : 2.5}
              fill={i === peakIndex ? '#f4d47c' : '#e8b94a'}
              stroke="#0a1710"
              strokeWidth={1}
            />
          ))}

          <defs>
            <linearGradient id="overallGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8b94a" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#e8b94a" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink-500">
        <span>
          {ui(language, 'homeSeasonAge')} {history[0].season} ({history[0].age} {ui(language, 'homeYearsOld')})
        </span>
        <span>
          {ui(language, 'peakLabel')} {values[peakIndex]} ({ui(language, 'homeSeasonAge').toLowerCase()} {history[peakIndex].season})
        </span>
        <span>
          {ui(language, 'homeSeasonAge')} {history[history.length - 1].season} ({history[history.length - 1].age} {ui(language, 'homeYearsOld')})
        </span>
      </div>
    </div>
  );
}
