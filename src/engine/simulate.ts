import type { PlayerState, SeasonRecord, TransferOffer } from './types';
import { overallRating } from './types';
import type { Country, CountryTier } from '../data/countries';
import type { Position } from '../data/positions';
import { getAgent } from '../data/agents';
import { CLUB_TIERS, generateClubName, getClubTier } from '../data/clubs';
import {
  INJURY_TYPES,
  WORLD_PLAYER_AWARD,
  TOP_SCORER_AWARD,
  TEAM_OF_YEAR_AWARD,
  GLOBAL_TOURNAMENT_NAME,
  CONTINENTAL_TOURNAMENT_NAME,
  TOURNAMENT_STAGE_LABELS,
} from '../data/awards';
import { nextFloat, nextInt, nextChance, nextWeightedPick, rngFromCarrier } from './rng';
import { clamp, adjustReputation, adjustFitness, adjustMorale, adjustAttribute, formatMoney } from './util';

export function computeOverall(state: PlayerState, position: Position): number {
  return overallRating(state.attributes, position.weights);
}

// ---------------- Offres de club ----------------

export function generateOffers(
  state: PlayerState,
  country: Country,
  position: Position,
  count: number,
): TransferOffer[] {
  const agent = getAgent(state.agentId);
  const scoutingBonus = state.advantageEffects.scouting ?? 0;
  const wageBoost = state.advantageEffects.wage_boost ?? 0;
  const overall = computeOverall(state, position);
  const score = overall * 0.65 + country.leagueStrength * 3.2 + state.reputation * 0.25 + (country.scouting - 5) * 2;
  const biasedScore = score * (agent.offerQualityModifier + scoutingBonus);

  const sigma = 14;
  const weighted = CLUB_TIERS.map((t) => {
    const diff = biasedScore - t.prestige;
    const w = Math.exp(-(diff * diff) / (2 * sigma * sigma)) * (t.index === 0 ? 0.15 : 1);
    return { tier: t, weight: w };
  });

  const effectiveCount = Math.max(1, Math.round(count * (agent.offerFrequencyModifier + scoutingBonus)));
  const offers: TransferOffer[] = [];
  for (let i = 0; i < effectiveCount; i++) {
    const total = weighted.reduce((s, w) => s + w.weight, 0);
    let r = nextFloat(state) * total;
    let picked = weighted[weighted.length - 1].tier;
    for (const w of weighted) {
      r -= w.weight;
      if (r <= 0) { picked = w.tier; break; }
    }
    const variance = 0.75 + nextFloat(state) * 0.6;
    const wage = Math.round(picked.wageBase * variance * (0.6 + state.reputation / 130) * (1 + wageBoost));
    const signingBonus = Math.round(wage * (0.1 + nextFloat(state) * 0.35));
    const roleRoll = nextFloat(state);
    const role: TransferOffer['role'] = roleRoll < 0.45 ? 'titulaire' : roleRoll < 0.8 ? 'rotation' : 'reserviste';
    const avoid = [...state.seenClubNames, ...offers.map((o) => o.clubName)];
    offers.push({
      clubName: generateClubName(rngFromCarrier(state), avoid),
      tierIndex: picked.index,
      countryCode: country.code,
      wage,
      signingBonus,
      role,
    });
  }
  // dédoublonne les noms de club générés dans le même lot
  const seen = new Set<string>();
  const deduped = offers.filter((o) => (seen.has(o.clubName) ? false : (seen.add(o.clubName), true)));

  // Mémorise ces clubs pour ne pas les reproposer indéfiniment après un refus.
  state.seenClubNames = [...state.seenClubNames, ...deduped.map((o) => o.clubName)].slice(-60);

  return deduped;
}

// ---------------- Simulation de la saison sportive ----------------

export interface SeasonSimResult {
  record: SeasonRecord;
  narrative: string[];
}

const SEASON_LENGTH = 34;

export function simulateSeason(state: PlayerState, country: Country, position: Position): SeasonSimResult {
  const narrative: string[] = [];
  const overall = computeOverall(state, position);
  const clubTier = state.club ? getClubTier(state.club.tierIndex) : getClubTier(0);

  if (!state.club) {
    narrative.push("Sans club cette saison : tu t'entraînes en amateur et multiplies les essais.");
    adjustMorale(state, -6);
    return { record: emptySeasonRecord(state), narrative };
  }

  const levelGap = overall - clubTier.prestige; // positif = tu domines ton niveau
  const playtimeFactor = clamp(0.35 + levelGap / 60 + state.form / 220 + state.fitness / 260, 0.15, 1);
  let appearances = Math.round(SEASON_LENGTH * playtimeFactor);

  // ---- Blessures typées : réduisent le temps de jeu, avec risque de séquelle définitive ----
  const injuryShield = state.advantageEffects.injury_shield ?? 0;
  const injuryChance = clamp(
    (0.16 + (100 - state.fitness) / 260 + (100 - country.infrastructure * 10) / 900) * (1 - injuryShield),
    0.03,
    0.55,
  );
  let injuryNote: string | undefined;
  if (nextChance(state, injuryChance)) {
    const type = nextWeightedPick(state, INJURY_TYPES.map((t) => ({ item: t, weight: t.weight })));
    const matchesOut = nextInt(state, type.minMatchesOut, type.maxMatchesOut);
    appearances = Math.max(0, appearances - matchesOut);
    state.careerInjuries += 1;
    adjustFitness(state, -Math.min(35, 10 + matchesOut));
    injuryNote = `${matchesOut} match${matchesOut > 1 ? 's' : ''} manqué${matchesOut > 1 ? 's' : ''} (${type.label})`;
    narrative.push(`Blessure : ${type.label}, indisponible ${matchesOut} match${matchesOut > 1 ? 's' : ''}.`);
    if (nextChance(state, type.permanentDecayChance)) {
      const decay = nextInt(state, 2, 6);
      const target = nextChance(state, 0.5) ? 'vitesse' : 'physique';
      adjustAttribute(state, target, -decay);
      state.potential[target] = clamp(state.potential[target] - decay, 1, 99);
      narrative.push(`Séquelle physique durable : perte définitive de ${target === 'vitesse' ? 'vitesse' : 'physique'} (-${decay}).`);
    }
  } else {
    adjustFitness(state, nextInt(state, -4, 10));
  }

  // ---- Cartons et suspensions ----
  const cardProneness = position.weights.defense / 4 + (1 - state.discipline / 100);
  const expectedYellows = (appearances / SEASON_LENGTH) * (1.5 + cardProneness * 5);
  const cardsYellow = Math.max(0, Math.round(expectedYellows * (0.6 + nextFloat(state) * 0.7)));
  const redChance = clamp(0.03 + (1 - state.discipline / 100) * 0.07, 0.01, 0.18);
  let cardsRed = 0;
  if (appearances > 0 && nextChance(state, redChance)) {
    cardsRed = 1;
    const suspension = nextInt(state, 1, 3);
    appearances = Math.max(0, appearances - suspension);
    narrative.push(`Carton rouge et suspension de ${suspension} match${suspension > 1 ? 's' : ''}.`);
  }

  // Note moyenne : proche de 6.5 en cas d'équilibre, monte si tu domines ton niveau.
  const avgRating = clamp(6.2 + levelGap / 22 + (nextFloat(state) - 0.5) * 0.6, 3.5, 9.6);

  let goals = 0;
  let assists = 0;
  let cleanSheets = 0;
  let saves = 0;

  if (position.code === 'GK') {
    const cleanSheetChance = clamp(0.22 + levelGap / 140 + state.attributes.mental / 400, 0.05, 0.65);
    for (let m = 0; m < appearances; m++) if (nextChance(state, cleanSheetChance)) cleanSheets++;
    saves = Math.round(appearances * (2.2 + (state.attributes.reflexes / 99) * 4.5) * (0.8 + nextFloat(state) * 0.4));
    if (nextChance(state, 0.01)) goals = 1; // but exceptionnel de gardien
    if (nextChance(state, 0.04)) assists = 1;
  } else {
    const attackWeight = position.weights.tir + position.weights.technique * 0.4;
    const goalFactor = (attackWeight / 4) * (state.attributes.tir / 99) * (appearances / SEASON_LENGTH);
    goals = Math.max(0, Math.round(goalFactor * 26 * (0.7 + nextFloat(state) * 0.6)));
    const assistFactor = (position.weights.passe + position.weights.vision * 0.6) / 4;
    assists = Math.max(0, Math.round(assistFactor * (state.attributes.passe / 99) * (appearances / SEASON_LENGTH) * 18 * (0.7 + nextFloat(state) * 0.6)));
  }

  // Réputation et valeur marchande évoluent avec la performance et l'exposition du club.
  const performanceScore =
    position.code === 'GK'
      ? (avgRating - 6.5) * 8 + cleanSheets * 3
      : (avgRating - 6.5) * 8 + goals * 1.2 + assists * 0.8;
  adjustReputation(state, Math.round(performanceScore * 0.4 + clubTier.prestige * 0.05));
  const ageValueFactor = state.age <= 24 ? 1.15 : state.age <= 29 ? 1.05 : state.age <= 33 ? 0.85 : state.age <= 37 ? 0.55 : 0.3;
  state.marketValue = Math.max(
    1000,
    Math.round((overall * overall * 380 + state.reputation * 6000) * ageValueFactor * (clubTier.prestige / 60 + 0.4)),
  );

  // Trophées collectifs (probabilité liée au prestige du club).
  const trophies: string[] = [];
  const trophyChance = clamp((clubTier.prestige - 30) / 160, 0, 0.5);
  if (nextChance(state, trophyChance)) {
    const trophyName = clubTier.index >= 5 ? 'Ligue des Champions' : clubTier.index >= 4 ? 'Coupe continentale' : 'Championnat national';
    trophies.push(trophyName);
    state.trophies.push(`${trophyName} — saison ${state.season} (${state.club.name})`);
    narrative.push(`Sacre collectif : ${trophyName} avec ${state.club.name} !`);
  }

  // Sélection nationale.
  const capsResult = simulateNationalTeam(state, country, overall);
  narrative.push(...capsResult.narrative);

  // Tournoi international tous les 4 ans (alterné mondial / continental).
  const tournamentNarrative = simulateInternationalTournament(state, country, overall);
  narrative.push(...tournamentNarrative);

  // Distinctions individuelles majeures.
  const majorAwards = rollIndividualAwards(state, position, { goals, avgRating, cleanSheets, wonTrophy: trophies.length > 0 });
  for (const award of majorAwards) narrative.push(`Distinction individuelle : ${award} !`);

  state.careerGoals += goals;
  state.careerAssists += assists;
  state.careerAppearances += appearances;
  state.careerCleanSheets += cleanSheets;
  state.careerSaves += saves;
  state.careerYellowCards += cardsYellow;
  state.careerRedCards += cardsRed;

  if (position.code === 'GK') {
    narrative.unshift(`${appearances} matchs, ${cleanSheets} clean sheet${cleanSheets > 1 ? 's' : ''}, ${saves} arrêts — note moyenne ${avgRating.toFixed(1)}/10.`);
  } else {
    narrative.unshift(
      `${appearances} matchs, ${goals} but${goals > 1 ? 's' : ''}, ${assists} passe${assists > 1 ? 's' : ''} décisive${assists > 1 ? 's' : ''} — note moyenne ${avgRating.toFixed(1)}/10.`,
    );
  }

  const record: SeasonRecord = {
    season: state.season,
    age: state.age,
    clubName: state.club.name,
    clubTierIndex: state.club.tierIndex,
    countryCode: state.club.countryCode,
    appearances,
    goals,
    assists,
    cleanSheets,
    saves,
    avgRating: Math.round(avgRating * 10) / 10,
    trophies,
    majorAwards,
    caps: capsResult.capsGained,
    capGoals: capsResult.capGoals,
    captainThisSeason: state.captain,
    overall,
    marketValue: state.marketValue,
    wage: state.wage,
    cardsYellow,
    cardsRed,
    injuryNote,
    narrative,
  };

  return { record, narrative };
}

function emptySeasonRecord(state: PlayerState): SeasonRecord {
  return {
    season: state.season,
    age: state.age,
    clubName: 'Sans club',
    clubTierIndex: 0,
    countryCode: state.countryCode,
    appearances: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    saves: 0,
    avgRating: 0,
    trophies: [],
    majorAwards: [],
    caps: 0,
    capGoals: 0,
    captainThisSeason: false,
    overall: 0,
    marketValue: state.marketValue,
    wage: state.wage,
    cardsYellow: 0,
    cardsRed: 0,
    narrative: [],
  };
}

interface NationalTeamResult {
  capsGained: number;
  capGoals: number;
  narrative: string[];
}

function simulateNationalTeam(state: PlayerState, country: Country, overall: number): NationalTeamResult {
  const narrative: string[] = [];
  if (state.age < 17) return { capsGained: 0, capGoals: 0, narrative };

  // Score de sélectionnabilité : ton niveau relatif + la facilité d'accès du pays.
  const selectionScore = overall * 0.5 + state.reputation * 0.3 + country.nationalTeamAccess * 5 - country.competition * 3;
  const callUpProbability = clamp(selectionScore / 110, 0.01, 0.97);

  if (!nextChance(state, callUpProbability)) return { capsGained: 0, capGoals: 0, narrative };

  const isDebut = state.caps === 0;
  const capsGained = nextInt(state, 1, 8);
  const capGoals = Math.max(0, Math.round((state.attributes.tir / 99) * capsGained * 0.35 * nextFloat(state)));
  state.caps += capsGained;
  state.capGoals += capGoals;

  if (isDebut) {
    narrative.push(`Première sélection en équipe nationale ${isMicro(country) ? '— une immense fierté pour ton petit pays' : ''} !`);
  } else {
    narrative.push(`${capsGained} sélection${capsGained > 1 ? 's' : ''} de plus avec la sélection nationale.`);
  }

  if (!state.captain && state.caps >= 25 && country.nationalTeamAccess >= 7 && nextChance(state, 0.25)) {
    state.captain = true;
    narrative.push('Le sélectionneur te confie le brassard de capitaine national !');
  }

  return { capsGained, capGoals, narrative };
}

function isMicro(country: Country): boolean {
  return country.population === 'micro';
}

// ---------------- Tournoi international (tous les 4 ans, mondial / continental en alternance) ----------------

const TIER_STRENGTH: Record<CountryTier, number> = { S: 9, A: 7, B: 5, C: 3, D: 1 };

function simulateInternationalTournament(state: PlayerState, country: Country, overall: number): string[] {
  const narrative: string[] = [];
  if (state.caps === 0) return narrative;

  const cycle = state.season % 4;
  let tournamentName: string | null = null;
  if (cycle === 0) tournamentName = GLOBAL_TOURNAMENT_NAME;
  else if (cycle === 2) tournamentName = CONTINENTAL_TOURNAMENT_NAME;
  if (!tournamentName) return narrative;

  const selectionChance = clamp(0.2 + state.reputation / 150 + country.nationalTeamAccess / 20, 0.05, 0.95);
  if (!nextChance(state, selectionChance)) return narrative;

  const teamStrength = TIER_STRENGTH[country.tier];
  const personalBoost = (overall - 50) / 25 + state.reputation / 100;
  const tournamentScore = teamStrength + personalBoost * 3 + nextFloat(state) * 4;

  const stage: keyof typeof TOURNAMENT_STAGE_LABELS =
    tournamentScore < 4 ? 'groupes' : tournamentScore < 7 ? 'quarts' : tournamentScore < 9 ? 'demies' : tournamentScore < 11.5 ? 'finale' : 'vainqueur';

  narrative.push(`${tournamentName} avec la sélection : ${TOURNAMENT_STAGE_LABELS[stage]}.`);
  adjustReputation(state, stage === 'vainqueur' ? 14 : stage === 'finale' ? 9 : stage === 'demies' ? 5 : 2);

  if (stage === 'vainqueur') {
    state.trophies.push(`${tournamentName} — saison ${state.season} (sélection nationale)`);
  }

  return narrative;
}

// ---------------- Distinctions individuelles majeures ----------------

function rollIndividualAwards(
  state: PlayerState,
  position: Position,
  ctx: { goals: number; avgRating: number; cleanSheets: number; wonTrophy: boolean },
): string[] {
  const won: string[] = [];

  const worldClassThreshold = state.reputation >= 78 && ctx.avgRating >= 7.4;
  if (worldClassThreshold) {
    state.ballonsAttempts += 1;
    const winChance = clamp((state.reputation - 78) / 45 + (ctx.wonTrophy ? 0.12 : 0) + ctx.goals / 60, 0.02, 0.4);
    if (nextChance(state, winChance)) {
      won.push(WORLD_PLAYER_AWARD);
      state.majorAwards.push(`${WORLD_PLAYER_AWARD} — saison ${state.season}`);
    }
  }

  if (position.code !== 'GK' && ctx.goals >= 24) {
    const scorerChance = clamp((ctx.goals - 24) / 20 + 0.08, 0.03, 0.55);
    if (nextChance(state, scorerChance)) {
      won.push(TOP_SCORER_AWARD);
      state.majorAwards.push(`${TOP_SCORER_AWARD} — saison ${state.season} (${ctx.goals} buts)`);
    }
  }

  if (state.reputation >= 62 && ctx.avgRating >= 7.1) {
    const teamOfYearChance = clamp((state.reputation - 62) / 60 + (ctx.avgRating - 7.1) / 10, 0.03, 0.4);
    if (nextChance(state, teamOfYearChance)) {
      won.push(TEAM_OF_YEAR_AWARD);
      state.majorAwards.push(`${TEAM_OF_YEAR_AWARD} — saison ${state.season}`);
    }
  }

  return won;
}

export function offerLabel(offer: TransferOffer): string {
  return `${offer.clubName} — ${formatMoney(offer.wage)}/an`;
}
