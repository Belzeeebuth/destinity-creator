// Capture générique des variations de stats provoquées par un choix (évènement, négociation...).
// Permet d'afficher des pastilles "+3 👁️ Vision" chiffrées et colorées sans avoir à
// faire remonter manuellement les deltas depuis chaque effet du jeu.
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, ATTRIBUTE_ICONS, getPosition } from '../data/positions';
import type { PlayerState, StatDelta } from './types';
import { overallRating } from './types';

export type { StatDelta };

interface StatSnapshot {
  attributes: Record<string, number>;
  overall: number;
  morale: number;
  discipline: number;
  reputation: number;
  fitness: number;
  wage: number;
  marketValue: number;
  caps: number;
}

const META_STATS: { key: keyof StatSnapshot; label: string; icon: string; isMoney?: boolean; minDelta?: number }[] = [
  { key: 'overall', label: 'Général (OVR)', icon: '⚡', minDelta: 0.1 },
  { key: 'morale', label: 'Moral', icon: '😊' },
  { key: 'discipline', label: 'Discipline', icon: '📏' },
  { key: 'reputation', label: 'Réputation', icon: '⭐' },
  { key: 'fitness', label: 'Forme', icon: '🔋' },
  { key: 'wage', label: 'Salaire', icon: '💰', isMoney: true },
  { key: 'marketValue', label: 'Valeur marchande', icon: '📈', isMoney: true },
  { key: 'caps', label: 'Sélections', icon: '🌍' },
];

export function snapshotStats(state: PlayerState): StatSnapshot {
  const position = getPosition(state.positionCode);
  return {
    attributes: { ...state.attributes },
    overall: overallRating(state.attributes, position.weights),
    morale: state.morale,
    discipline: state.discipline,
    reputation: state.reputation,
    fitness: state.fitness,
    wage: state.wage,
    marketValue: state.marketValue,
    caps: state.caps,
  };
}

export function diffStats(before: StatSnapshot, after: StatSnapshot): StatDelta[] {
  const deltas: StatDelta[] = [];

  for (const key of ATTRIBUTE_KEYS) {
    const delta = Math.round((after.attributes[key] - before.attributes[key]) * 10) / 10;
    if (Math.abs(delta) >= 0.5) {
      deltas.push({ key, label: ATTRIBUTE_LABELS[key], icon: ATTRIBUTE_ICONS[key], delta });
    }
  }

  for (const meta of META_STATS) {
    const rawDelta = (after[meta.key] as number) - (before[meta.key] as number);
    const delta = Math.round(rawDelta * 10) / 10;
    if (Math.abs(delta) >= (meta.minDelta ?? 1)) {
      deltas.push({ key: meta.key, label: meta.label, icon: meta.icon, delta, isMoney: meta.isMoney });
    }
  }

  return deltas;
}
