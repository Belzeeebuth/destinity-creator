import { create } from 'zustand';
import type { PlayerState, EventChoiceOutcome } from '../engine/types';
import type { AttributeKey } from '../data/positions';
import * as CareerEngine from '../engine/career';
import type { CreateCareerInput } from '../engine/career';
import {
  loadMeta,
  saveMeta,
  addTokens,
  purchaseAdvantage as purchaseAdvantageMeta,
  setEquippedAdvantages as setEquippedMeta,
  unlockBadges,
  addPantheonEntry,
  incrementCareersPlayed,
  computeLegendScore,
  computeTokensEarned,
  markDailyChallengeDone,
  type MetaProfile,
  type PantheonEntry,
} from '../engine/meta';
import { evaluateBadges, BADGES } from '../data/badges';
import { getCountry } from '../data/countries';
import { getAdvantage } from '../data/shop';

const CAREER_STORAGE_KEY = 'destiny11_career_v1';

function loadCareer(): PlayerState | null {
  try {
    const raw = localStorage.getItem(CAREER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlayerState;
  } catch {
    return null;
  }
}

function saveCareer(state: PlayerState | null): void {
  try {
    if (state) localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(CAREER_STORAGE_KEY);
  } catch {
    // stockage indisponible : on ignore
  }
}

export interface CareerEndSummary {
  legendScore: number;
  tokensEarned: number;
  newBadgeIds: string[];
  pantheonEntry: PantheonEntry | null;
}

interface GameStore {
  career: PlayerState | null;
  activeEventChoices: EventChoiceOutcome[] | null;
  lastEventResult: string | null;
  meta: MetaProfile;
  careerEndSummary: CareerEndSummary | null;

  startCareer: (input: CreateCareerInput) => void;
  chooseFocus: (attr: AttributeKey) => void;
  pickEventChoice: (index: number) => void;
  continueAfterEvent: () => void;
  runSeasonSim: () => void;
  acceptOffer: (index: number) => void;
  declineOffers: () => void;
  advanceSeason: () => void;
  retireNow: () => void;
  abandonCareer: () => void;
  finalizeCareerEnd: () => void;

  purchaseAdvantage: (id: string) => void;
  setEquippedAdvantages: (ids: string[]) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  career: loadCareer(),
  activeEventChoices: null,
  lastEventResult: null,
  meta: loadMeta(),
  careerEndSummary: null,

  startCareer: (input) => {
    const career = CareerEngine.createCareer(input);
    saveCareer(career);
    const meta = incrementCareersPlayed(get().meta);
    saveMeta(meta);
    set({ career, activeEventChoices: null, lastEventResult: null, careerEndSummary: null, meta });
  },

  chooseFocus: (attr) => {
    const { career } = get();
    if (!career) return;
    const choices = CareerEngine.chooseFocusAndStartEvents(career, attr);
    saveCareer(career);
    set({ career: { ...career }, activeEventChoices: choices });
  },

  pickEventChoice: (index) => {
    const { career, activeEventChoices } = get();
    if (!career || !activeEventChoices) return;
    const resultText = CareerEngine.resolveEventChoice(career, activeEventChoices, index);
    saveCareer(career);
    set({ career: { ...career }, activeEventChoices: null, lastEventResult: resultText });
  },

  continueAfterEvent: () => {
    const { career } = get();
    if (!career) return;
    const choices = CareerEngine.drawNextEvent(career);
    saveCareer(career);
    set({ career: { ...career }, activeEventChoices: choices, lastEventResult: null });
  },

  runSeasonSim: () => {
    const { career } = get();
    if (!career) return;
    CareerEngine.runSeasonSim(career);
    saveCareer(career);
    set({ career: { ...career } });
  },

  acceptOffer: (index) => {
    const { career } = get();
    if (!career) return;
    CareerEngine.acceptOffer(career, index);
    saveCareer(career);
    set({ career: { ...career } });
  },

  declineOffers: () => {
    const { career } = get();
    if (!career) return;
    CareerEngine.declineOffers(career);
    saveCareer(career);
    set({ career: { ...career } });
  },

  advanceSeason: () => {
    const { career } = get();
    if (!career) return;
    const { forcedRetirement } = CareerEngine.finalizeSeasonEnd(career);
    saveCareer(career);
    set({ career: { ...career } });
    if (forcedRetirement) get().finalizeCareerEnd();
  },

  retireNow: () => {
    const { career } = get();
    if (!career) return;
    CareerEngine.retireCareer(career, 'Retraite volontaire, sur un dernier tour de terrain.');
    saveCareer(career);
    set({ career: { ...career } });
    get().finalizeCareerEnd();
  },

  abandonCareer: () => {
    saveCareer(null);
    set({ career: null, activeEventChoices: null, lastEventResult: null, careerEndSummary: null });
  },

  finalizeCareerEnd: () => {
    const { career, meta } = get();
    if (!career) return;
    const country = getCountry(career.countryCode);
    const overall =
      career.history.length > 0 ? career.history[career.history.length - 1].overall : 0;

    const legendScore = computeLegendScore({
      careerGoals: career.careerGoals,
      careerAssists: career.careerAssists,
      caps: career.caps,
      trophies: career.trophies.length,
      finalOverall: overall,
      finalAge: career.age,
      captain: career.captain,
    });

    // Idempotence : si cette carrière a déjà été comptabilisée (rechargement de page
    // après la retraite), on ré-affiche le récapitulatif sans re-distribuer jetons/badges.
    if (career.finalized) {
      set({ careerEndSummary: { legendScore, tokensEarned: 0, newBadgeIds: [], pantheonEntry: null } });
      return;
    }

    const newBadgeIds = evaluateBadges(career, meta.unlockedBadgeIds, country.tier);
    const tokensEarned = computeTokensEarned(legendScore, newBadgeIds.length);

    const pantheonEntry: PantheonEntry = {
      id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      playerName: `${career.firstName} ${career.lastName}`,
      countryCode: career.countryCode,
      countryName: country.name,
      positionCode: career.positionCode,
      legendScore,
      summary: `${career.careerGoals} buts, ${career.careerAssists} passes, ${career.caps} sélections, ${career.trophies.length} trophée(s) — retraite à ${career.age} ans`,
      createdAt: new Date().toISOString(),
      mode: career.mode,
    };

    let nextMeta = addTokens(meta, tokensEarned);
    nextMeta = unlockBadges(nextMeta, newBadgeIds);
    nextMeta = addPantheonEntry(nextMeta, pantheonEntry);
    if (career.mode === 'daily') nextMeta = markDailyChallengeDone(nextMeta, legendScore);
    saveMeta(nextMeta);

    career.finalized = true;
    saveCareer(career);

    set({
      career: { ...career },
      meta: nextMeta,
      careerEndSummary: { legendScore, tokensEarned, newBadgeIds, pantheonEntry },
    });
  },

  purchaseAdvantage: (id) => {
    const { meta } = get();
    const advantage = getAdvantage(id);
    if (!advantage) return;
    const next = purchaseAdvantageMeta(meta, id, advantage.cost);
    saveMeta(next);
    set({ meta: next });
  },

  setEquippedAdvantages: (ids) => {
    const { meta } = get();
    const next = setEquippedMeta(meta, ids);
    saveMeta(next);
    set({ meta: next });
  },
}));

export function badgeNameById(id: string): string {
  return BADGES.find((b) => b.id === id)?.name ?? id;
}
