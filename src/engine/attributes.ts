import type { AttributeKey, Position } from '../data/positions';
import { ATTRIBUTE_KEYS } from '../data/positions';
import type { Country } from '../data/countries';
import type { Background } from '../data/backgrounds';
import type { Rng } from './rng';
import { randInt } from './rng';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Âge à partir duquel chaque attribut entame son déclin, et vitesse de ce déclin.
// Les attributs physiques déclinent tôt et vite ; la lecture du jeu et le mental
// tiennent beaucoup plus longtemps (l'expérience compense le physique déclinant).
const AGING_PROFILE: Record<AttributeKey, { declineStart: number; declineRate: number }> = {
  vitesse: { declineStart: 30, declineRate: 1.5 },
  physique: { declineStart: 32, declineRate: 1.1 },
  reflexes: { declineStart: 34, declineRate: 0.7 },
  technique: { declineStart: 34, declineRate: 0.4 },
  tir: { declineStart: 34, declineRate: 0.5 },
  defense: { declineStart: 33, declineRate: 0.5 },
  passe: { declineStart: 35, declineRate: 0.3 },
  vision: { declineStart: 38, declineRate: 0.15 },
  mental: { declineStart: 41, declineRate: 0.1 },
};

// Les gardiens et défenseurs centraux atteignent leur pic plus tard.
const POSITION_PEAK_OFFSET: Record<string, number> = {
  GK: 4,
  CB: 2,
  DM: 1,
  FB: 0,
  CM: 0,
  AM: -1,
  WI: -2,
  ST: -1,
};

export function initializeAttributes(
  position: Position,
  background: Background,
  country: Country,
  rng: Rng,
): { attributes: Record<AttributeKey, number>; potential: Record<AttributeKey, number> } {
  const attributes = {} as Record<AttributeKey, number>;
  const potential = {} as Record<AttributeKey, number>;

  for (const key of ATTRIBUTE_KEYS) {
    const weight = position.weights[key];
    const isKeyAttribute = position.keyAttributes.includes(key);
    // Base de départ : plus l'attribut est important pour le poste, plus la base est haute.
    // Constante calibrée pour une note générale moyenne d'environ 45 à la création (16 ans).
    let base = 37 + weight * 4 + randInt(rng, -4, 4);
    base += background.attributeStart[key] ?? 0;
    if (key === 'reflexes' && position.code !== 'GK') {
      base = 5 + randInt(rng, -2, 2); // hors gardiens, réflexes n'est presque pas utilisé
    }
    base = clamp(base, 8, 68);
    attributes[key] = Math.round(base);

    // Potentiel : plafond que l'attribut pourra atteindre en fin de progression.
    const infraBonus = (country.infrastructure - 5) * 1.6;
    const ceilingRoll = randInt(rng, 18, 42) * (isKeyAttribute ? 1.15 : 0.85);
    let ceiling = base + ceilingRoll + infraBonus;
    if (key === 'reflexes' && position.code !== 'GK') ceiling = attributes[key] + randInt(rng, 0, 3);
    potential[key] = Math.round(clamp(ceiling, base, 99));
  }

  return { attributes, potential };
}

export interface GrowthContext {
  age: number;
  position: Position;
  growthModifier: number; // discipline de vie, avantages boutique, etc.
  infrastructure: number; // 1-10, qualité du club/pays actuel
  fitness: number; // 0-100, condition physique du moment
  focusAttribute?: AttributeKey; // attribut prioritaire choisi en pré-saison
}

export function growSeason(
  attributes: Record<AttributeKey, number>,
  potential: Record<AttributeKey, number>,
  ctx: GrowthContext,
  rng: Rng,
): Record<AttributeKey, number> {
  const next = { ...attributes };
  const offset = POSITION_PEAK_OFFSET[ctx.position.code] ?? 0;

  for (const key of ATTRIBUTE_KEYS) {
    const profile = AGING_PROFILE[key];
    const declineStart = profile.declineStart + offset;
    const current = attributes[key];
    const cap = potential[key];
    const isFocus = ctx.focusAttribute === key;

    if (ctx.age < declineStart && current < cap) {
      const gap = cap - current;
      const ageFactor =
        ctx.age <= 19 ? 0.16 : ctx.age <= 22 ? 0.12 : ctx.age <= 25 ? 0.08 : ctx.age <= 28 ? 0.045 : 0.02;
      const infraFactor = 0.55 + (ctx.infrastructure / 10) * 0.6;
      const fitnessFactor = 0.5 + (ctx.fitness / 100) * 0.6;
      const focusBonus = isFocus ? 1.6 : 1;
      let delta = gap * ageFactor * ctx.growthModifier * infraFactor * fitnessFactor * focusBonus;
      delta *= 0.7 + rng() * 0.6;
      delta = clamp(delta, 0, 6);
      next[key] = clamp(Math.round((current + delta) * 10) / 10, current, cap);
    } else if (ctx.age >= declineStart) {
      const yearsOver = ctx.age - declineStart;
      const decline = profile.declineRate * (1 + yearsOver * 0.09) * (0.75 + rng() * 0.5);
      next[key] = clamp(Math.round((current - decline) * 10) / 10, 1, 99);
    }
  }

  return next;
}
