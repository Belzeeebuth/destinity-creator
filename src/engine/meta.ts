// Progression méta persistante (localStorage) : jetons, avantages, badges, panthéon,
// et suivi du défi quotidien. Indépendant d'une carrière en cours.
import { MAX_EQUIPPED_ADVANTAGES } from '../data/shop';

export interface PantheonEntry {
  id: string;
  playerName: string;
  countryCode: string;
  countryName: string;
  positionCode: string;
  legendScore: number;
  summary: string;
  createdAt: string;
  mode: string;
}

export interface MetaProfile {
  tokens: number;
  unlockedAdvantageIds: string[];
  equippedAdvantageIds: string[];
  unlockedBadgeIds: string[];
  pantheon: PantheonEntry[];
  dailyChallenge: { lastCompletedDate: string | null; lastScore: number | null };
  careersPlayed: number;
}

const STORAGE_KEY = 'destiny11_meta_v1';

function defaultProfile(): MetaProfile {
  return {
    tokens: 0,
    unlockedAdvantageIds: [],
    equippedAdvantageIds: [],
    unlockedBadgeIds: [],
    pantheon: [],
    dailyChallenge: { lastCompletedDate: null, lastScore: null },
    careersPlayed: 0,
  };
}

export function loadMeta(): MetaProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw) as Partial<MetaProfile>;
    return { ...defaultProfile(), ...parsed };
  } catch {
    return defaultProfile();
  }
}

export function saveMeta(meta: MetaProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  } catch {
    // stockage indisponible (mode privé, quota...) : on ignore silencieusement
  }
}

export function addTokens(meta: MetaProfile, amount: number): MetaProfile {
  return { ...meta, tokens: meta.tokens + amount };
}

export function purchaseAdvantage(meta: MetaProfile, advantageId: string, cost: number): MetaProfile {
  if (meta.tokens < cost || meta.unlockedAdvantageIds.includes(advantageId)) return meta;
  return {
    ...meta,
    tokens: meta.tokens - cost,
    unlockedAdvantageIds: [...meta.unlockedAdvantageIds, advantageId],
  };
}

export function setEquippedAdvantages(meta: MetaProfile, ids: string[]): MetaProfile {
  const limited = ids.filter((id) => meta.unlockedAdvantageIds.includes(id)).slice(0, MAX_EQUIPPED_ADVANTAGES);
  return { ...meta, equippedAdvantageIds: limited };
}

export function unlockBadges(meta: MetaProfile, ids: string[]): MetaProfile {
  if (ids.length === 0) return meta;
  const merged = Array.from(new Set([...meta.unlockedBadgeIds, ...ids]));
  return { ...meta, unlockedBadgeIds: merged };
}

export function addPantheonEntry(meta: MetaProfile, entry: PantheonEntry, maxEntries = 100): MetaProfile {
  const pantheon = [entry, ...meta.pantheon].sort((a, b) => b.legendScore - a.legendScore).slice(0, maxEntries);
  return { ...meta, pantheon };
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isDailyChallengeDoneToday(meta: MetaProfile): boolean {
  return meta.dailyChallenge.lastCompletedDate === todayDateString();
}

export function markDailyChallengeDone(meta: MetaProfile, score: number): MetaProfile {
  return { ...meta, dailyChallenge: { lastCompletedDate: todayDateString(), lastScore: score } };
}

export function incrementCareersPlayed(meta: MetaProfile): MetaProfile {
  return { ...meta, careersPlayed: meta.careersPlayed + 1 };
}

// ---------------- Calcul des jetons et du score de légende en fin de carrière ----------------

export function computeLegendScore(params: {
  careerGoals: number;
  careerAssists: number;
  caps: number;
  trophies: number;
  finalOverall: number;
  finalAge: number;
  captain: boolean;
}): number {
  const longevityBonus = Math.max(0, params.finalAge - 30) * 4;
  return Math.round(
    params.careerGoals * 1.2 +
      params.careerAssists * 0.9 +
      params.caps * 1.5 +
      params.trophies * 20 +
      params.finalOverall * 4 +
      (params.captain ? 25 : 0) +
      longevityBonus,
  );
}

export function computeTokensEarned(legendScore: number, badgesUnlocked: number): number {
  return Math.max(10, Math.round(legendScore / 12) + badgesUnlocked * 15);
}
