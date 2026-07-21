import type { AttributeKey } from '../data/positions';
import { getPosition } from '../data/positions';
import { getCountry } from '../data/countries';
import { getBackground } from '../data/backgrounds';
import { getLifestyle } from '../data/lifestyles';
import { getAgent } from '../data/agents';
import { randomName } from '../data/names';
import { rollEvent } from '../data/events';
import { rollMidSeasonEvent } from '../data/midSeasonEvents';
import { resolveEquippedEffects } from '../data/shop';
import { resolveClubTier } from '../data/clubs';
import type { EventChoiceOutcome, PlayerState, TournamentMatchResult } from './types';
import { MAX_AGE, START_AGE } from './types';
import { initializeAttributes, growSeason } from './attributes';
import { generateOffers, simulateSeason } from './simulate';
import {
  checkTournamentEligibility,
  startTournament,
  playNextGroupMatch,
  playKnockoutMatch,
} from './tournament';
import { clamp, formatMoney } from './util';
import { nextFloat, nextInt, nextChance, rngFromCarrier, type RngCarrier } from './rng';
import { snapshotStats, diffStats, type StatDelta } from './diff';

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
  advantageLevels?: Record<string, number>;
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
  const advantageEffects = resolveEquippedEffects(advantagesEquipped, input.advantageLevels ?? {});
  const potentialBoost = advantageEffects.potential ?? 0;
  const youthHeadstart = advantageEffects.youth_headstart ?? 0;
  for (const key of Object.keys(potential) as AttributeKey[]) {
    potential[key] = clamp(potential[key] + potentialBoost, 1, 99);
    attributes[key] = clamp(attributes[key] + youthHeadstart, 1, potential[key]);
  }

  const reputationStart = 5 + country.scouting + (advantageEffects.reputation_start ?? 0);
  const moraleStart = clamp(
    background.moraleStart + lifestyle.moraleModifier + (advantageEffects.morale_start ?? 0),
    0,
    100,
  );
  const fitnessStart = clamp(80 + (advantageEffects.fitness ?? 0), 0, 100);

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
    careerCleanSheets: 0,
    careerSaves: 0,
    careerYellowCards: 0,
    careerRedCards: 0,
    trophies: [],
    awards: [],
    majorAwards: [],
    consumables: [],

    pendingTournamentInvite: null,
    activeTournament: null,
    playedTournamentThisSeason: false,

    history: [],
    seenClubNames: [],
    pendingOffers: [],
    pendingEvent: null,
    eventsRemainingThisSeason: 0,
    recentEventIds: [],
    seasonLog: [],
    lastSeasonNarrative: [],
    lastGrowthDeltas: [],

    retired: false,
    finalized: false,
    advantagesEquipped,
    advantageEffects,
    seasonGrowthBoostValue: 0,
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
    return startMidSeasonCheckpoint(state);
  }
  const country = getCountry(state.countryCode);
  const rolled = rollEvent(state, country.tier, state.recentEventIds);
  if (!rolled) {
    state.eventsRemainingThisSeason = 0;
    return startMidSeasonCheckpoint(state);
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

// Point de mi-saison : casse l'instantanéité en insérant une courte pause interactive
// entre les évènements de pré-saison et la simulation complète de la saison.
export function startMidSeasonCheckpoint(state: PlayerState): EventChoiceOutcome[] {
  const rolled = rollMidSeasonEvent(state);
  state.phase = 'mid_season';
  state.pendingEvent = {
    templateId: rolled.template.id,
    title: rolled.title,
    text: rolled.text,
    choices: rolled.choices.map((c) => ({ label: c.label })),
  };
  return rolled.choices;
}

export function resolveEventChoice(
  state: PlayerState,
  choices: EventChoiceOutcome[],
  choiceIndex: number,
): { text: string; deltas: StatDelta[] } {
  const choice = choices[choiceIndex];
  const before = snapshotStats(state);
  const resultText = choice.apply(state);
  const deltas = diffStats(before, snapshotStats(state));
  state.eventsRemainingThisSeason = Math.max(0, state.eventsRemainingThisSeason - 1);
  state.pendingEvent = null;
  state.seasonLog.push(resultText);
  return { text: resultText, deltas };
}

// ---------------- Phase : invitation à un tournoi international ----------------

// Appelé à la sortie de la pause de mi-saison : soit le joueur est appelé en sélection
// pour un tournoi cette saison (proposition à l'écran), soit on enchaîne directement
// sur la simulation de la saison en club.
export function resolveMidSeasonToSeasonSim(state: PlayerState): void {
  const position = getPosition(state.positionCode);
  const invite = checkTournamentEligibility(state, position);
  if (invite) {
    state.pendingTournamentInvite = invite;
    state.phase = 'tournament_invite';
  } else {
    state.phase = 'season_sim';
  }
}

export function acceptTournamentInvite(state: PlayerState): void {
  const invite = state.pendingTournamentInvite;
  if (!invite) return;
  startTournament(state, invite.tournamentName);
}

export function declineTournamentInvite(state: PlayerState): void {
  state.pendingTournamentInvite = null;
  state.seasonLog.push("Tu déclines l'appel en sélection pour te concentrer sur ton club et ta progression.");
  state.phase = 'season_sim';
}

export function playTournamentStep(state: PlayerState): TournamentMatchResult {
  const position = getPosition(state.positionCode);
  const t = state.activeTournament;
  if (!t) throw new Error('Aucun tournoi actif.');
  const result = t.stage === 'groupes' ? playNextGroupMatch(state, position) : playKnockoutMatch(state, position);
  if (t.stage === 'termine') {
    state.seasonLog.push(
      `${t.tournamentName} : ${t.finalStageLabel} — ${t.playerGoals} but${t.playerGoals > 1 ? 's' : ''}, ${t.playerAssists} passe${t.playerAssists > 1 ? 's' : ''} décisive${t.playerAssists > 1 ? 's' : ''}.`,
    );
  }
  return result;
}

export function continueAfterTournament(state: PlayerState): void {
  state.activeTournament = null;
  state.phase = 'season_sim';
}

// ---------------- Phase : simulation de la saison ----------------

export function runSeasonSim(state: PlayerState): void {
  const country = getCountry(state.countryCode);
  const position = getPosition(state.positionCode);
  const { record, narrative } = simulateSeason(state, country, position);
  state.history.push(record);
  state.lastSeasonNarrative = narrative;

  // La progression/déclin des attributs est calculée ici (entraînement de la saison qui
  // vient d'être jouée) pour pouvoir en afficher le détail dans le bilan de fin de saison.
  const lifestyle = getLifestyle(state.lifestyleId);
  const growthBonus = state.advantageEffects.growth ?? 0;
  const growthModifier = lifestyle.growthModifier * (1 + growthBonus + state.seasonGrowthBoostValue);
  state.seasonGrowthBoostValue = 0; // effet du consommable "boost d'entraînement" consommé pour cette saison
  const hostInfrastructure = state.club && state.club.countryCode !== state.countryCode
    ? getCountry(state.club.countryCode).infrastructure
    : country.infrastructure;

  const before = snapshotStats(state);
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
  state.lastGrowthDeltas = diffStats(before, snapshotStats(state));

  state.phase = 'season_end';
}

// ---------------- Phase : fenêtre des transferts (en début de saison suivante) ----------------

export function acceptOffer(state: PlayerState, offerIndex: number): void {
  const offer = state.pendingOffers[offerIndex];
  if (!offer) return;
  state.club = {
    name: offer.clubName,
    tierIndex: offer.tierIndex,
    countryCode: offer.countryCode,
    releaseClause: offer.releaseClause,
    divisionLevel: offer.divisionLevel,
  };
  state.wage = offer.wage;
  state.marketValue = Math.max(state.marketValue, Math.round(offer.wage * 3.2));
  state.pendingOffers = [];
  state.phase = 'preseason';
}

export function declineOffers(state: PlayerState): void {
  state.pendingOffers = [];
  state.phase = 'preseason';
}

// ---------------- Négociation de contrat ----------------

export type NegotiationAspect = 'wage' | 'role' | 'clause';

export function negotiateOffer(state: PlayerState, offerIndex: number, aspect: NegotiationAspect): string {
  const offer = state.pendingOffers[offerIndex];
  if (!offer) return "Cette offre n'est plus disponible.";
  if (offer.negotiated) return 'Tu as déjà négocié avec ce club ce marché-ci.';

  const agent = getAgent(state.agentId);
  const clubTier = resolveClubTier(offer);
  const leverage = clamp((state.reputation - clubTier.prestige) / 100 + (agent.offerQualityModifier - 1) * 0.4, -0.3, 0.5);
  const successChance = clamp(0.45 + leverage, 0.12, 0.85);
  offer.negotiated = true;

  if (nextChance(state, successChance)) {
    if (aspect === 'wage') {
      offer.wage = Math.round(offer.wage * (1.12 + nextFloat(state) * 0.18));
      return `Négociation réussie : le salaire proposé grimpe à ${formatMoney(offer.wage)} par an.`;
    }
    if (aspect === 'role') {
      offer.role = 'titulaire';
      return 'Le club cède : ton statut de titulaire est garanti par contrat.';
    }
    offer.releaseClause = Math.round(offer.wage * nextInt(state, 12, 35));
    return `Une clause libératoire de ${formatMoney(offer.releaseClause)} est ajoutée à ton contrat.`;
  }

  if (nextChance(state, 0.25)) {
    state.pendingOffers = state.pendingOffers.filter((_, i) => i !== offerIndex);
    return 'Le club se braque face à tes exigences et retire purement et simplement son offre !';
  }
  return "Le club refuse ta demande. L'offre reste inchangée, tu peux toujours la signer.";
}

// ---------------- Phase : fin de saison / vieillissement ----------------

export function finalizeSeasonEnd(state: PlayerState): { forcedRetirement: boolean } {
  if (state.age >= MAX_AGE) {
    retireCareer(state, `Limite d'âge atteinte (${MAX_AGE} ans) : fin de carrière obligatoire.`);
    return { forcedRetirement: true };
  }

  const position = getPosition(state.positionCode);
  const country = getCountry(state.countryCode);

  state.age += 1;
  state.season += 1;
  state.form = clamp(Math.round(50 + (state.morale - 50) * 0.35 + (nextFloat(state) - 0.5) * 22), 10, 95);
  state.fitness = clamp(state.fitness + nextInt(state, -3, 14), 25, 100);
  state.playedTournamentThisSeason = false;

  const agent = getAgent(state.agentId);
  const scoutingBonus = state.advantageEffects.scouting ?? 0;
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
