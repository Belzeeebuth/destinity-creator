import { COUNTRIES } from '../data/countries';
import { POSITIONS, type PositionCode } from '../data/positions';
import { BACKGROUNDS } from '../data/backgrounds';
import { LIFESTYLES } from '../data/lifestyles';
import { AGENTS } from '../data/agents';
import { hashSeed, mulberry32, pick } from './rng';
import type { CreateCareerInput } from './career';

export function getDailyChallengeConfig(date: Date = new Date()): CreateCareerInput {
  const dateStr = date.toISOString().slice(0, 10);
  const setupRng = mulberry32(hashSeed(`destiny11:${dateStr}:setup`));
  const playSeed = hashSeed(`destiny11:${dateStr}:play`);

  return {
    countryCode: pick(setupRng, COUNTRIES).code,
    positionCode: pick(setupRng, POSITIONS).code,
    backgroundId: pick(setupRng, BACKGROUNDS).id,
    lifestyleId: pick(setupRng, LIFESTYLES).id,
    agentId: pick(setupRng, AGENTS).id,
    seed: playSeed,
    mode: 'daily',
  };
}

export interface ShareCode {
  countryCode: string;
  positionCode: PositionCode;
  backgroundId: string;
  lifestyleId: string;
  agentId: string;
  seed: number;
}

export function encodeShareCode(input: ShareCode): string {
  const json = JSON.stringify(input);
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeShareCode(code: string): ShareCode | null {
  try {
    const json = decodeURIComponent(escape(atob(code.trim())));
    const parsed = JSON.parse(json) as ShareCode;
    if (!parsed.countryCode || !parsed.positionCode || !parsed.seed) return null;
    return parsed;
  } catch {
    return null;
  }
}
