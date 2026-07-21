import type { AttributeKey } from '../data/positions';
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

export function adjustMorale(state: PlayerState, delta: number): void {
  state.morale = clamp(Math.round(state.morale + delta), 0, 100);
}

export function adjustDiscipline(state: PlayerState, delta: number): void {
  state.discipline = clamp(Math.round(state.discipline + delta), 0, 100);
}

export function adjustReputation(state: PlayerState, delta: number): void {
  state.reputation = clamp(Math.round(state.reputation + delta), 0, 100);
}

export function adjustFitness(state: PlayerState, delta: number): void {
  state.fitness = clamp(Math.round(state.fitness + delta), 0, 100);
}

export function formatMoney(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)} M€`;
  if (value >= 1_000) return `${Math.round(value / 1000)} k€`;
  return `${Math.round(value)} €`;
}
