import type { AttributeKey } from '../data/positions';
import { getPosition } from '../data/positions';
import type { PlayerState } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function adjustAttribute(state: PlayerState, key: AttributeKey, delta: number): void {
  state.attributes[key] = clamp(Math.round((state.attributes[key] + delta) * 10) / 10, 1, 99);
  if (state.attributes[key] > state.potential[key]) {
    state.potential[key] = state.attributes[key];
  }
}

// Répartit un delta de note générale (OVR) sur tous les attributs pondérés du poste actuel :
// comme overall = somme(attr*poids)/somme(poids), ajouter `amount` à chaque attribut pondéré
// déplace la moyenne pondérée d'exactement `amount` (avant écrêtage éventuel par le potentiel).
export function adjustOverallBy(state: PlayerState, amount: number): void {
  const position = getPosition(state.positionCode);
  for (const key of Object.keys(position.weights) as AttributeKey[]) {
    if (position.weights[key] > 0) adjustAttribute(state, key, amount);
  }
}

// Contrairement à adjustAttribute, ceci abaisse aussi le potentiel : la perte est réellement
// définitive, l'entraînement ne pourra jamais la faire remonter au-delà de ce nouveau plafond.
export function applyPermanentAttributeLoss(state: PlayerState, key: AttributeKey, amount: number): void {
  state.attributes[key] = clamp(Math.round((state.attributes[key] - amount) * 10) / 10, 1, 99);
  state.potential[key] = clamp(Math.round((state.potential[key] - amount) * 10) / 10, state.attributes[key], 99);
}

export function adjustMorale(state: PlayerState, delta: number): void {
  state.morale = clamp(Math.round(state.morale + delta), 0, 100);
}

export function adjustDiscipline(state: PlayerState, delta: number): void {
  state.discipline = clamp(Math.round(state.discipline + delta), 0, 100);
}

// Un bouclier de réputation (achat de prestige) amortit l'ampleur des pertes, jamais des gains.
export function adjustReputation(state: PlayerState, delta: number): void {
  const shielded = delta < 0 ? delta * (1 - (state.reputationShield ?? 0)) : delta;
  state.reputation = clamp(Math.round(state.reputation + shielded), 0, 100);
}

export function adjustFitness(state: PlayerState, delta: number): void {
  state.fitness = clamp(Math.round(state.fitness + delta), 0, 100);
}

export function formatMoney(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)} M€`;
  if (value >= 1_000) return `${Math.round(value / 1000)} k€`;
  return `${Math.round(value)} €`;
}
