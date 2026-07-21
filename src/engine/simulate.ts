import type { PlayerState, SeasonRecord, TransferOffer } from './types';
import { overallRating } from './types';
import type { Country } from '../data/countries';
import type { Position } from '../data/positions';
import { getAgent } from '../data/agents';
import { CLUB_TIERS, generateClubName, getClubTier } from '../data/clubs';
import { getEquippedEffect } from '../data/shop';
import { nextFloat, nextInt, nextChance, rngFromCarrier } from './rng';
import { clamp, adjustReputation, adjustFitness, adjustMorale, formatMoney } from './util';

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
  const scoutingBonus = getEquippedEffect(state.advantagesEquipped, 'scouting');
  const wageBoost = getEquippedEffect(state.advantagesEquipped, 'wage_boost');
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
    offers.push({
      clubName: generateClubName(rngFromCarrier(state)),
      tierIndex: picked.index,
      countryCode: country.code,
      wage,
      signingBonus,
      role,
    });
  }
  // dédoublonne les noms de club générés dans le même lot
  const seen = new Set<string>();
  return offers.filter((o) => (seen.has(o.clubName) ? false : (seen.add(o.clubName), true)));
}

// ---------------- Simulation de la saison sportive ----------------

export interface SeasonSimResult {
  record: SeasonRecord;
  narrative: string[];
}

export function simulateSeason(state: PlayerState, country: Country, position: Position): SeasonSimResult {
  const narrative: string[] = [];
  const overall = computeOverall(state, position);
  const clubTier = state.club ? getClubTier(state.club.tierIndex) : getClubTier(0);

  if (!state.club) {
    narrative.push("Sans club cette saison : tu t'entraînes en amateur et multiplies les essais.");
    adjustMorale(state, -6);
    return {
      record: emptySeasonRecord(state),
      narrative,
    };
  }

  // Temps de jeu : dépend de la forme, du niveau du joueur vs celui du club, et de la discipline.
  const levelGap = overall - clubTier.prestige; // positif = tu domines ton niveau
  const baseAppearances = 34;
  const playtimeFactor = clamp(0.35 + levelGap / 60 + state.form / 220 + state.fitness / 260, 0.15, 1);
  const appearances = Math.round(baseAppearances * playtimeFactor);

  // Note moyenne : proche de 6.5 en cas d'équilibre, monte si tu domines ton niveau.
  const avgRating = clamp(6.2 + levelGap / 22 + (nextFloat(state) - 0.5) * 0.6, 3.5, 9.6);

  // Buts/passes décisives, pondérés par le poste.
  const attackWeight = position.weights.tir + position.weights.technique * 0.4;
  const goalFactor = (attackWeight / 4) * (state.attributes.tir / 99) * (appearances / 34);
  const goals = Math.max(0, Math.round(goalFactor * 26 * (0.7 + nextFloat(state) * 0.6)));
  const assistFactor = (position.weights.passe + position.weights.vision * 0.6) / 4;
  const assists = Math.max(0, Math.round(assistFactor * (state.attributes.passe / 99) * (appearances / 34) * 18 * (0.7 + nextFloat(state) * 0.6)));

  // Réputation et valeur marchande évoluent avec la performance et l'exposition du club.
  const performanceScore = (avgRating - 6.5) * 8 + goals * 1.2 + assists * 0.8;
  adjustReputation(state, Math.round(performanceScore * 0.4 + clubTier.prestige * 0.05));
  const ageValueFactor = state.age <= 24 ? 1.15 : state.age <= 29 ? 1.05 : state.age <= 33 ? 0.85 : state.age <= 37 ? 0.55 : 0.3;
  state.marketValue = Math.max(
    1000,
    Math.round((overall * overall * 380 + state.reputation * 6000) * ageValueFactor * (clubTier.prestige / 60 + 0.4)),
  );

  // Blessures.
  const injuryShield = getEquippedEffect(state.advantagesEquipped, 'injury_shield');
  const injuryChance = clamp(
    (0.05 + (100 - state.fitness) / 260 + (100 - country.infrastructure * 10) / 900) * (1 - injuryShield),
    0.01,
    0.4,
  );
  if (nextChance(state, injuryChance)) {
    state.careerInjuries += 1;
    adjustFitness(state, -nextInt(state, 10, 30));
    narrative.push('Une blessure est venue perturber ta saison.');
  } else {
    adjustFitness(state, nextInt(state, -4, 10));
  }

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

  state.careerGoals += goals;
  state.careerAssists += assists;
  state.careerAppearances += appearances;

  narrative.unshift(
    `${appearances} matchs, ${goals} but${goals > 1 ? 's' : ''}, ${assists} passe${assists > 1 ? 's' : ''} décisive${assists > 1 ? 's' : ''} — note moyenne ${avgRating.toFixed(1)}/10.`,
  );

  const record: SeasonRecord = {
    season: state.season,
    age: state.age,
    clubName: state.club.name,
    clubTierIndex: state.club.tierIndex,
    countryCode: state.club.countryCode,
    appearances,
    goals,
    assists,
    avgRating: Math.round(avgRating * 10) / 10,
    trophies,
    caps: capsResult.capsGained,
    capGoals: capsResult.capGoals,
    captainThisSeason: state.captain,
    overall,
    marketValue: state.marketValue,
    wage: state.wage,
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
    avgRating: 0,
    trophies: [],
    caps: 0,
    capGoals: 0,
    captainThisSeason: false,
    overall: 0,
    marketValue: state.marketValue,
    wage: state.wage,
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

export function offerLabel(offer: TransferOffer): string {
  return `${offer.clubName} — ${formatMoney(offer.wage)}/an`;
}
