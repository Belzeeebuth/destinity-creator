import type { AttributeKey } from '../data/positions';
import { getPosition } from '../data/positions';
import { getCountry } from '../data/countries';
import { getBackground } from '../data/backgrounds';
import { getLifestyle } from '../data/lifestyles';
import { getAgent } from '../data/agents';
import { randomName } from '../data/names';
import { rollEvent } from '../data/events';
import { getEquippedEffect } from '../data/shop';
import type { EventChoiceOutcome, PlayerState } from './types';
import { MAX_AGE, START_AGE } from './types';
import { initializeAttributes, growSeason } from './attributes';
import { generateOffers, simulateSeason } from './simulate';
import { clamp } from './util';
import { nextFloat, nextInt, rngFromCarrier, type RngCarrier } from './rng';

export interface CreateCareerInput {
  firstName?: string;
  lastName?: string;
  countryCode: string;
  positionCode: import('../data/positions').PositionCode;
  backgroundId: string;
  lifestyleId: string;
  agentId: string;
  seed: number;
  mode?: PlayerState['mode'];
  advantagesEquipped?: string[];
}

export function createCareer(input: CreateCareerInput): PlayerState {
  const carrier: RngCarrier = { rngState: input.seed };
  const rng = rngFromCarrier(carrier);

  const country = getCountry(input.countryCode);
  const position = getPosition(input.positionCode);
  const background = getBackground(input.backgroundId);
  const lifestyle = getLifestyle(input.lifestyleId);

  const generated = randomName(input.countryCode, rng);
  const { attributes, potential } = initializeAttributes(position, background, country, rng);

  const advantagesEquipped = input.advantagesEquipped ?? [];
  const potentialBoost = getEquippedEffect(advantagesEquipped, 'potential');
  const youthHeadstart = getEquippedEffect(advantagesEquipped, 'youth_headstart');
  for (const key of Object.keys(potential) as AttributeKey[]) {
    potential[key] = clamp(potential[key] + potentialBoost, 1, 99);
    attributes[key] = clamp(attributes[key] + youthHeadstart, 1, potential[key]);
  }

  const reputationStart = 5 + country.scouting + getEquippedEffect(advantagesEquipped, 'reputation_start');
  const moraleStart = clamp(
    background.moraleStart + lifestyle.moraleModifier + getEquippedEffect(advantagesEquipped, 'morale_start'),
    0,
    100,
  );
  const fitnessStart = clamp(80 + getEquippedEffect(advantagesEquipped, 'fitness'), 0, 100);

  const state: PlayerState = {
    firstName: input.firstName?.trim() || generated.firstName,
    lastName: input.lastName?.trim() || generated.lastName,
    countryCode: input.countryCode,
    positionCode: input.positionCode,
    backgroundId: input.backgroundId,
    lifestyleId: input.lifestyleId,
    agentId: input.agentId,
    seed: input.seed,
    rngState: carrier.rngState,
    mode: input.mode ?? 'classic',

    age: START_AGE,
    season: 1,
    phase: 'transfer_window',

    attributes,
    potential,

    morale: moraleStart,
    fitness: fitnessStart,
    discipline: clamp(background.disciplineStart + lifestyle.disciplineModifier, 0, 100),
    reputation: clamp(reputationStart, 1, 100),
    form: 55,

    marketValue: 3000,
    wage: 0,
    club: null,

    caps: 0,
    capGoals: 0,
    captain: false,
    ballonsAttempts: 0,

    careerGoals: 0,
    careerAssists: 0,
    careerAppearances: 0,
    careerInjuries: 0,
    trophies: [],
    awards: [],

    history: [],
    pendingOffers: [],
    pendingEvent: null,
    eventsRemainingThisSeason: 0,
    recentEventIds: [],
    seasonLog: [],
    lastSeasonNarrative: [],

    retired: false,
    finalized: false,
    advantagesEquipped,
  };

  state.pendingOffers = generateOffers(state, country, position, 3);
  if (state.pendingOffers.length === 0) state.phase = 'preseason';
  return state;
}

// ---------------- Phase : pré-saison ----------------

export function chooseFocusAndStartEvents(state: PlayerState, focus: AttributeKey): EventChoiceOutcome[] | null {
  state.focusAttribute = focus;
  state.eventsRemainingThisSeason = state.age <= 20 || state.age >= 36 ? 3 : 2;
  state.phase = 'event';
  state.seasonLog = [];
  return drawNextEvent(state);
}

// ---------------- Phase : évènements narratifs ----------------

export function drawNextEvent(state: PlayerState): EventChoiceOutcome[] | null {
  if (state.eventsRemainingThisSeason <= 0) {
    state.pendingEvent = null;
    state.phase = 'season_sim';
    return null;
  }
  const country = getCountry(state.countryCode);
  const rolled = rollEvent(state, country.tier, state.recentEventIds);
  if (!rolled) {
    state.eventsRemainingThisSeason = 0;
    state.pendingEvent = null;
    state.phase = 'season_sim';
    return null;
  }
  state.recentEventIds = [rolled.template.id, ...state.recentEventIds].slice(0, 6);
  state.pendingEvent = {
    templateId: rolled.template.id,
    title: rolled.title,
    text: rolled.text,
    choices: rolled.choices.map((c) => ({ label: c.label })),
  };
  return rolled.choices;
}

export function resolveEventChoice(state: PlayerState, choices: EventChoiceOutcome[], choiceIndex: number): string {
  const choice = choices[choiceIndex];
  const resultText = choice.apply(state);
  state.eventsRemainingThisSeason = Math.max(0, state.eventsRemainingThisSeason - 1);
  state.pendingEvent = null;
  state.seasonLog.push(resultText);
  return resultText;
}

// ---------------- Phase : simulation de la saison ----------------

export function runSeasonSim(state: PlayerState): void {
  const country = getCountry(state.countryCode);
  const position = getPosition(state.positionCode);
  const { record, narrative } = simulateSeason(state, country, position);
  state.history.push(record);
  state.lastSeasonNarrative = narrative;
  state.phase = 'season_end';
}

// ---------------- Phase : fenêtre des transferts (en début de saison suivante) ----------------

export function acceptOffer(state: PlayerState, offerIndex: number): void {
  const offer = state.pendingOffers[offerIndex];
  if (!offer) return;
  state.club = { name: offer.clubName, tierIndex: offer.tierIndex, countryCode: offer.countryCode };
  state.wage = offer.wage;
  state.marketValue = Math.max(state.marketValue, Math.round(offer.wage * 3.2));
  state.pendingOffers = [];
  state.phase = 'preseason';
}

export function declineOffers(state: PlayerState): void {
  state.pendingOffers = [];
  state.phase = 'preseason';
}

// ---------------- Phase : fin de saison / vieillissement ----------------

export function finalizeSeasonEnd(state: PlayerState): { forcedRetirement: boolean } {
  if (state.age >= MAX_AGE) {
    retireCareer(state, `Limite d'âge atteinte (${MAX_AGE} ans) : fin de carrière obligatoire.`);
    return { forcedRetirement: true };
  }

  const position = getPosition(state.positionCode);
  const country = getCountry(state.countryCode);
  const lifestyle = getLifestyle(state.lifestyleId);
  const growthBonus = getEquippedEffect(state.advantagesEquipped, 'growth');
  const growthModifier = lifestyle.growthModifier * (1 + growthBonus);
  const hostInfrastructure = state.club && state.club.countryCode !== state.countryCode
    ? getCountry(state.club.countryCode).infrastructure
    : country.infrastructure;

  state.attributes = growSeason(
    state.attributes,
    state.potential,
    {
      age: state.age,
      position,
      growthModifier,
      infrastructure: state.club ? hostInfrastructure : country.infrastructure,
      fitness: state.fitness,
      focusAttribute: state.focusAttribute,
    },
    rngFromCarrier(state),
  );

  state.age += 1;
  state.season += 1;
  state.form = clamp(Math.round(50 + (state.morale - 50) * 0.35 + (nextFloat(state) - 0.5) * 22), 10, 95);
  state.fitness = clamp(state.fitness + nextInt(state, -3, 14), 25, 100);

  const agent = getAgent(state.agentId);
  const scoutingBonus = getEquippedEffect(state.advantagesEquipped, 'scouting');
  const moveDesireChance = clamp(0.1 + state.reputation / 260, 0, 0.6) * (agent.offerFrequencyModifier + scoutingBonus);
  const shouldOffer = !state.club || nextFloat(state) < moveDesireChance;
  state.pendingOffers = shouldOffer ? generateOffers(state, country, position, state.club ? 2 : 3) : [];
  state.phase = state.pendingOffers.length > 0 ? 'transfer_window' : 'preseason';
  return { forcedRetirement: false };
}

export function retireCareer(state: PlayerState, reason: string): void {
  state.retired = true;
  state.retirementReason = reason;
  state.phase = 'retired';
}

export const MIN_VOLUNTARY_RETIREMENT_AGE = 30;
