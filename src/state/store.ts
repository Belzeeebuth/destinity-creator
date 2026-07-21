import { create } from 'zustand';
import type { PlayerState, EventChoiceOutcome, TournamentMatchResult } from '../engine/types';
import type { AttributeKey } from '../data/positions';
import * as CareerEngine from '../engine/career';
import type { CreateCareerInput } from '../engine/career';
import {
  loadMeta,
  saveMeta,
  addTokens,
  upgradeAdvantage as upgradeAdvantageMeta,
  setEquippedAdvantages as setEquippedMeta,
  purchaseConsumable as purchaseConsumableMeta,
  consumeItem,
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
import { getConsumable } from '../data/shop';
import { adjustFitness, adjustMorale } from '../engine/util';
import type { StatDelta } from '../engine/diff';

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
  lastEventDeltas: StatDelta[];
  lastNegotiationResult: string | null;
  lastTournamentMatch: TournamentMatchResult | null;
  meta: MetaProfile;
  careerEndSummary: CareerEndSummary | null;

  startCareer: (input: CreateCareerInput) => void;
  chooseFocus: (attr: AttributeKey) => void;
  pickEventChoice: (index: number) => void;
  continueAfterEvent: () => void;
  acceptTournamentInvite: () => void;
  declineTournamentInvite: () => void;
  playTournamentStep: () => void;
  acknowledgeTournamentMatch: () => void;
  continueAfterTournament: () => void;
  runSeasonSim: () => void;
  acceptOffer: (index: number) => void;
  declineOffers: () => void;
  negotiateOffer: (index: number, aspect: CareerEngine.NegotiationAspect) => void;
  advanceSeason: () => void;
  retireNow: () => void;
  abandonCareer: () => void;
  finalizeCareerEnd: () => void;

  upgradeAdvantage: (id: string) => void;
  setEquippedAdvantages: (ids: string[]) => void;
  purchaseConsumable: (id: string) => void;
  activateConsumable: (id: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  career: loadCareer(),
  activeEventChoices: null,
  lastEventResult: null,
  lastEventDeltas: [],
  lastNegotiationResult: null,
  lastTournamentMatch: null,
  meta: loadMeta(),
  careerEndSummary: null,

  startCareer: (input) => {
    const meta = get().meta;
    const career = CareerEngine.createCareer({ ...input, advantageLevels: meta.advantageLevels });
    saveCareer(career);
    const nextMeta = incrementCareersPlayed(meta);
    saveMeta(nextMeta);
    set({
      career,
      activeEventChoices: null,
      lastEventResult: null,
      lastEventDeltas: [],
      lastNegotiationResult: null,
      lastTournamentMatch: null,
      careerEndSummary: null,
      meta: nextMeta,
    });
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
    const { text, deltas } = CareerEngine.resolveEventChoice(career, activeEventChoices, index);
    saveCareer(career);
    set({ career: { ...career }, activeEventChoices: null, lastEventResult: text, lastEventDeltas: deltas });
  },

  continueAfterEvent: () => {
    const { career } = get();
    if (!career) return;
    if (career.phase === 'mid_season') {
      // La pause de mi-saison vient d'être résolue : soit une sélection nationale appelle
      // le joueur pour un tournoi, soit on enchaîne directement sur la saison en club.
      career.pendingEvent = null;
      CareerEngine.resolveMidSeasonToSeasonSim(career);
      saveCareer(career);
      set({ career: { ...career }, activeEventChoices: null, lastEventResult: null, lastEventDeltas: [] });
      return;
    }
    const choices = CareerEngine.drawNextEvent(career);
    saveCareer(career);
    set({ career: { ...career }, activeEventChoices: choices, lastEventResult: null, lastEventDeltas: [] });
  },

  acceptTournamentInvite: () => {
    const { career } = get();
    if (!career) return;
    CareerEngine.acceptTournamentInvite(career);
    saveCareer(career);
    set({ career: { ...career }, lastTournamentMatch: null });
  },

  declineTournamentInvite: () => {
    const { career } = get();
    if (!career) return;
    CareerEngine.declineTournamentInvite(career);
    saveCareer(career);
    set({ career: { ...career } });
  },

  playTournamentStep: () => {
    const { career } = get();
    if (!career) return;
    const result = CareerEngine.playTournamentStep(career);
    saveCareer(career);
    set({ career: { ...career }, lastTournamentMatch: result });
  },

  acknowledgeTournamentMatch: () => {
    set({ lastTournamentMatch: null });
  },

  continueAfterTournament: () => {
    const { career } = get();
    if (!career) return;
    CareerEngine.continueAfterTournament(career);
    saveCareer(career);
    set({ career: { ...career }, lastTournamentMatch: null });
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

  negotiateOffer: (index, aspect) => {
    const { career } = get();
    if (!career) return;
    const result = CareerEngine.negotiateOffer(career, index, aspect);
    saveCareer(career);
    set({ career: { ...career }, lastNegotiationResult: result });
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
    set({
      career: null,
      activeEventChoices: null,
      lastEventResult: null,
      lastEventDeltas: [],
      lastNegotiationResult: null,
      lastTournamentMatch: null,
      careerEndSummary: null,
    });
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
      majorAwards: career.majorAwards,
      trophies: career.trophies,
      history: career.history,
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

  upgradeAdvantage: (id) => {
    const { meta } = get();
    const next = upgradeAdvantageMeta(meta, id);
    saveMeta(next);
    set({ meta: next });
  },

  setEquippedAdvantages: (ids) => {
    const { meta } = get();
    const next = setEquippedMeta(meta, ids);
    saveMeta(next);
    set({ meta: next });
  },

  purchaseConsumable: (id) => {
    const { meta } = get();
    const next = purchaseConsumableMeta(meta, id);
    saveMeta(next);
    set({ meta: next });
  },

  activateConsumable: (id) => {
    const { career, meta } = get();
    if (!career || (meta.consumablesOwned[id] ?? 0) <= 0) return;
    const consumable = getConsumable(id);
    if (!consumable) return;

    if (consumable.effect === 'instant_fitness') adjustFitness(career, consumable.value);
    else if (consumable.effect === 'instant_morale') adjustMorale(career, consumable.value);
    else if (consumable.effect === 'season_growth_boost') career.seasonGrowthBoostValue += consumable.value;
    career.seasonLog.push(`Objet utilisé : ${consumable.name}.`);

    const nextMeta = consumeItem(meta, id);
    saveCareer(career);
    saveMeta(nextMeta);
    set({ career: { ...career }, meta: nextMeta });
  },
}));

export function badgeNameById(id: string): string {
  return BADGES.find((b) => b.id === id)?.name ?? id;
}
