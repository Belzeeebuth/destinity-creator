// Simulation détaillée d'un tournoi international (Coupe Intercontinentale / Championnat
// Continental) : tirage de poule, matchs de groupe un par un, tableau de groupe, puis
// élimination directe jusqu'à la victoire ou l'élimination, avec classements individuels
// (buteur, passeur, meilleur joueur) à l'issue du tournoi.
import type {
  PlayerState,
  PendingTournamentInvite,
  TournamentKind,
  TournamentState,
  TournamentMatchResult,
  TournamentMatchTimelineEvent,
  TournamentTeamStanding,
  TournamentRivalStat,
} from './types';
import { overallRating } from './types';
import { COUNTRIES, getCountry, type CountryTier } from '../data/countries';
import type { Position } from '../data/positions';
import { randomName } from '../data/names';
import { GLOBAL_TOURNAMENT_NAME, GLOBAL_TOURNAMENT_NAME_EN, CONTINENTAL_TOURNAMENT_NAME, CONTINENTAL_TOURNAMENT_NAME_EN } from '../data/awards';
import { nextFloat, nextInt, nextChance, rngFromCarrier } from './rng';
import { clamp, adjustReputation, loc } from './util';

const TIER_STRENGTH: Record<CountryTier, number> = { S: 9, A: 7, B: 5, C: 3, D: 1.5 };

function computeOverall(state: PlayerState, position: Position): number {
  return overallRating(state.attributes, position.weights);
}

// ---------------- Éligibilité / invitation ----------------

export function checkTournamentEligibility(state: PlayerState, position: Position): PendingTournamentInvite | null {
  if (state.caps === 0) return null;
  const cycle = state.season % 4;
  let kind: TournamentKind | null = null;
  if (cycle === 0) kind = 'global';
  else if (cycle === 2) kind = 'continental';
  if (!kind) return null;
  const tournamentName =
    kind === 'global' ? loc(state, GLOBAL_TOURNAMENT_NAME, GLOBAL_TOURNAMENT_NAME_EN) : loc(state, CONTINENTAL_TOURNAMENT_NAME, CONTINENTAL_TOURNAMENT_NAME_EN);

  const country = getCountry(state.countryCode);
  const overall = computeOverall(state, position);
  const selectionChance = clamp(0.2 + state.reputation / 150 + country.nationalTeamAccess / 20 + overall / 400, 0.05, 0.97);
  if (!nextChance(state, selectionChance)) return null;

  return { tournamentName, kind };
}

// ---------------- Tirage et démarrage ----------------

function pickOpponents(state: PlayerState, exclude: string[], count: number): string[] {
  const pool = COUNTRIES.filter((c) => c.code !== state.countryCode && !exclude.includes(c.code));
  const chosen: string[] = [];
  const localExclude = [...exclude];
  for (let i = 0; i < count; i++) {
    const candidates = pool.filter((c) => !localExclude.includes(c.code));
    if (candidates.length === 0) break;
    const weighted = candidates.map((c) => ({ item: c.code, weight: c.competition + c.leagueStrength + 1 }));
    const total = weighted.reduce((s, w) => s + w.weight, 0);
    let r = nextFloat(state) * total;
    let picked = weighted[weighted.length - 1].item;
    for (const w of weighted) {
      r -= w.weight;
      if (r <= 0) { picked = w.item; break; }
    }
    chosen.push(picked);
    localExclude.push(picked);
  }
  return chosen;
}

export function startTournament(state: PlayerState, tournamentName: string, kind: TournamentKind): void {
  const opponents = pickOpponents(state, [state.countryCode], 3);
  const playerCountry = getCountry(state.countryCode);

  const table: TournamentTeamStanding[] = [
    emptyStanding(state.countryCode, loc(state, playerCountry.name, playerCountry.nameEn), true),
    ...opponents.map((code) => {
      const c = getCountry(code);
      return emptyStanding(code, loc(state, c.name, c.nameEn), false);
    }),
  ];

  state.activeTournament = {
    tournamentName,
    kind,
    stage: 'groupes',
    groupOpponents: opponents,
    groupMatchIndex: 0,
    groupTable: table,
    matches: [],
    eliminated: false,
    champion: false,
    finalStageLabel: loc(state, 'Phase de groupes', 'Group stage'),
    playerGoals: 0,
    playerAssists: 0,
    playerRatings: [],
    rivals: [],
    faced: [],
  };
  state.pendingTournamentInvite = null;
  state.phase = 'tournament';
}

function emptyStanding(countryCode: string, countryName: string, isPlayerTeam: boolean): TournamentTeamStanding {
  return { countryCode, countryName, isPlayerTeam, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
}

// ---------------- Simulation d'un match ----------------

function simulateMatch(
  state: PlayerState,
  position: Position,
  opponentCountryCode: string,
  roundLabel: string,
  isKnockout: boolean,
): TournamentMatchResult {
  const playerCountry = getCountry(state.countryCode);
  const opponent = getCountry(opponentCountryCode);
  const opponentName = loc(state, opponent.name, opponent.nameEn);
  const overall = computeOverall(state, position);

  // Le collectif (niveau de la nation) doit peser plus lourd qu'un seul joueur, aussi bon
  // soit-il : un joueur "très bon" ne doit pas à lui seul transformer une petite nation en
  // épouvantail qui rafle systématiquement la Coupe du Monde face à des cadors comme le Brésil.
  const playerTeamStrength = TIER_STRENGTH[playerCountry.tier] * 1.3 + overall / 24 + state.reputation / 60;
  const opponentTeamStrength = TIER_STRENGTH[opponent.tier] * 1.3 + 2 + nextFloat(state) * 4.5;
  const strengthDiff = clamp(playerTeamStrength - opponentTeamStrength, -8, 8);

  const expectedFor = clamp(1.3 + strengthDiff * 0.22, 0.2, 4.2);
  const expectedAgainst = clamp(1.3 - strengthDiff * 0.22, 0.2, 4.2);
  let scoreFor = poissonish(state, expectedFor);
  let scoreAgainst = poissonish(state, expectedAgainst);

  let wonOnPenalties: boolean | undefined;
  if (isKnockout && scoreFor === scoreAgainst) {
    const penaltyChance = clamp(0.5 + (state.attributes.mental - 50) / 300 + strengthDiff / 40, 0.15, 0.85);
    wonOnPenalties = nextChance(state, penaltyChance);
  }

  const isGK = position.code === 'GK';
  let playerGoals = 0;
  let playerAssists = 0;
  if (!isGK) {
    const involvement = (state.attributes.tir / 99) * 0.6 + (state.attributes.technique / 99) * 0.4;
    playerGoals = nextChance(state, clamp(involvement * (scoreFor > 0 ? 0.55 : 0.1), 0.02, 0.85))
      ? Math.min(scoreFor, 1 + (nextChance(state, 0.15) ? 1 : 0))
      : 0;
    const assistInvolvement = (state.attributes.passe / 99) * 0.6 + (state.attributes.vision / 99) * 0.4;
    playerAssists = nextChance(state, clamp(assistInvolvement * 0.4, 0.02, 0.7)) ? 1 : 0;
  }
  const playerRating = clamp(
    6 + (playerGoals * 0.9 + playerAssists * 0.6) + strengthDiff * 0.15 + (nextFloat(state) - 0.5) * 0.8,
    3.5,
    9.8,
  );

  const won = wonOnPenalties !== undefined ? wonOnPenalties : scoreFor > scoreAgainst;
  const draw = wonOnPenalties === undefined && scoreFor === scoreAgainst;

  let narrative: string;
  if (wonOnPenalties !== undefined) {
    narrative = wonOnPenalties
      ? loc(
          state,
          `${scoreFor}-${scoreAgainst} après prolongation : victoire aux tirs au but face à ${opponentName} !`,
          `${scoreFor}-${scoreAgainst} after extra time: won on penalties against ${opponentName}!`,
        )
      : loc(
          state,
          `${scoreFor}-${scoreAgainst} après prolongation : défaite aux tirs au but face à ${opponentName}.`,
          `${scoreFor}-${scoreAgainst} after extra time: lost on penalties against ${opponentName}.`,
        );
  } else if (won) {
    narrative = loc(state, `Victoire ${scoreFor}-${scoreAgainst} face à ${opponentName} !`, `Won ${scoreFor}-${scoreAgainst} against ${opponentName}!`);
  } else if (draw) {
    narrative = loc(state, `Match nul ${scoreFor}-${scoreAgainst} face à ${opponentName}.`, `Drew ${scoreFor}-${scoreAgainst} against ${opponentName}.`);
  } else {
    narrative = loc(state, `Défaite ${scoreFor}-${scoreAgainst} face à ${opponentName}.`, `Lost ${scoreFor}-${scoreAgainst} against ${opponentName}.`);
  }
  if (playerGoals > 0) {
    narrative += loc(state, ` Toi : ${playerGoals} but${playerGoals > 1 ? 's' : ''}.`, ` You: ${playerGoals} goal${playerGoals > 1 ? 's' : ''}.`);
  }
  if (playerAssists > 0) {
    narrative += loc(state, ` ${playerAssists} passe décisive.`, ` ${playerAssists} assist${playerAssists > 1 ? 's' : ''}.`);
  }

  const timeline = buildMatchTimeline(state, opponentName, scoreFor, scoreAgainst, playerGoals, playerAssists, isKnockout, wonOnPenalties);

  return {
    roundLabel,
    opponentCountryCode,
    opponentCountryName: opponentName,
    scoreFor,
    scoreAgainst,
    wonOnPenalties,
    playerGoals,
    playerAssists,
    playerRating: Math.round(playerRating * 10) / 10,
    narrative,
    timeline,
  };
}

// ---------------- Fil du match (minute par minute) ----------------

function shuffledIndices(state: PlayerState, n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = nextInt(state, 0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function distinctMinutes(state: PlayerState, count: number, max = 89): number[] {
  const minutes = new Set<number>();
  let guard = 0;
  while (minutes.size < count && guard < count * 25) {
    guard++;
    minutes.add(1 + nextInt(state, 0, max - 1));
  }
  return Array.from(minutes).sort((a, b) => a - b);
}

function leadPhrase(state: PlayerState, lead: number): string {
  if (lead === 0) return '';
  return lead > 0 ? loc(state, ' (tu mènes)', ' (you lead)') : loc(state, ' (tu es mené)', ' (you trail)');
}

// Construit un fil d'évènements minute par minute (but par but) pour donner du relief à un
// match qui, autrement, se résumait à un score annoncé d'un coup sans aucun déroulé.
function buildMatchTimeline(
  state: PlayerState,
  opponentName: string,
  scoreFor: number,
  scoreAgainst: number,
  playerGoals: number,
  playerAssists: number,
  isKnockout: boolean,
  wonOnPenalties: boolean | undefined,
): TournamentMatchTimelineEvent[] {
  const events: TournamentMatchTimelineEvent[] = [
    {
      minuteLabel: loc(state, "Coup d'envoi", 'Kickoff'),
      text: loc(state, `Le coup d'envoi est donné face à ${opponentName}.`, `Kickoff! The match begins against ${opponentName}.`),
    },
  ];

  const forMinutes = distinctMinutes(state, scoreFor);
  const againstMinutes = distinctMinutes(state, scoreAgainst);

  const playerGoalSlots = new Set<number>();
  if (playerGoals > 0 && forMinutes.length > 0) {
    shuffledIndices(state, forMinutes.length)
      .slice(0, Math.min(playerGoals, forMinutes.length))
      .forEach((i) => playerGoalSlots.add(i));
  }
  let assistSlot = -1;
  if (playerAssists > 0) {
    const remaining = forMinutes.map((_, i) => i).filter((i) => !playerGoalSlots.has(i));
    if (remaining.length > 0) assistSlot = remaining[nextInt(state, 0, remaining.length - 1)];
  }

  const raw = [
    ...forMinutes.map((minute, i) => ({ minute, side: 'for' as const, isPlayerGoal: playerGoalSlots.has(i), isPlayerAssist: i === assistSlot })),
    ...againstMinutes.map((minute) => ({ minute, side: 'against' as const, isPlayerGoal: false, isPlayerAssist: false })),
  ].sort((a, b) => a.minute - b.minute);

  let tallyFor = 0;
  let tallyAgainst = 0;
  for (const g of raw) {
    if (g.side === 'for') tallyFor += 1;
    else tallyAgainst += 1;
    const lead = tallyFor - tallyAgainst;
    const score = `${tallyFor}-${tallyAgainst}`;
    const leadTxt = leadPhrase(state, lead);
    const text =
      g.side === 'against'
        ? loc(state, `But de ${opponentName}. ${score}${leadTxt}`, `Goal for ${opponentName}. ${score}${leadTxt}`)
        : g.isPlayerGoal
          ? loc(state, `BUT DE TOI ! ${score}${leadTxt}`, `GOAL FOR YOU! ${score}${leadTxt}`)
          : g.isPlayerAssist
            ? loc(state, `But de ton équipe sur ta passe décisive ! ${score}${leadTxt}`, `Your team scores off your assist! ${score}${leadTxt}`)
            : loc(state, `But de ton équipe. ${score}${leadTxt}`, `Goal for your team. ${score}${leadTxt}`);
    events.push({ minuteLabel: `${g.minute}'`, text, isPlayerInvolved: g.isPlayerGoal || g.isPlayerAssist });
  }

  if (isKnockout && wonOnPenalties !== undefined) {
    events.push({
      minuteLabel: loc(state, 'Tirs au but', 'Penalty shootout'),
      text: wonOnPenalties
        ? loc(state, 'Score serré après prolongation : la séance de tirs au but sourit à ton équipe !', 'A tight score after extra time: the penalty shootout smiles on your team!')
        : loc(state, 'Score serré après prolongation : la séance de tirs au but échappe à ton équipe.', 'A tight score after extra time: the penalty shootout slips away from your team.'),
    });
  } else {
    events.push({ minuteLabel: loc(state, 'Coup de sifflet final', 'Full time'), text: loc(state, 'Coup de sifflet final.', 'Full time.') });
  }

  return events;
}

function poissonish(state: PlayerState, expected: number): number {
  // Approximation simple d'une distribution de buts plausible sans vraie loi de Poisson.
  let goals = 0;
  let remaining = expected;
  while (remaining > 0) {
    if (nextChance(state, clamp(remaining, 0.05, 0.9))) goals++;
    remaining -= 1;
  }
  return Math.min(goals, 8);
}

function recordTeamResult(standing: TournamentTeamStanding, goalsFor: number, goalsAgainst: number, won: boolean, draw: boolean): void {
  standing.played += 1;
  standing.goalsFor += goalsFor;
  standing.goalsAgainst += goalsAgainst;
  if (draw) { standing.drawn += 1; standing.points += 1; }
  else if (won) { standing.won += 1; standing.points += 3; }
  else { standing.lost += 1; }
}

// ---------------- Phase de groupes ----------------

export function playNextGroupMatch(state: PlayerState, position: Position): TournamentMatchResult {
  const t = state.activeTournament!;
  const opponentCode = t.groupOpponents[t.groupMatchIndex];
  const roundLabel = loc(state, `Phase de groupes — journée ${t.groupMatchIndex + 1}`, `Group stage — matchday ${t.groupMatchIndex + 1}`);
  const result = simulateMatch(state, position, opponentCode, roundLabel, false);

  const playerStanding = t.groupTable.find((s) => s.isPlayerTeam)!;
  const opponentStanding = t.groupTable.find((s) => s.countryCode === opponentCode)!;
  const won = result.wonOnPenalties !== undefined ? result.wonOnPenalties : result.scoreFor > result.scoreAgainst;
  const draw = result.wonOnPenalties === undefined && result.scoreFor === result.scoreAgainst;
  recordTeamResult(playerStanding, result.scoreFor, result.scoreAgainst, won, draw);
  recordTeamResult(opponentStanding, result.scoreAgainst, result.scoreFor, !won && !draw, draw);

  t.matches.push(result);
  t.playerGoals += result.playerGoals;
  t.playerAssists += result.playerAssists;
  t.playerRatings.push(result.playerRating);
  t.faced.push(opponentCode);
  state.caps += 1;
  state.capGoals += result.playerGoals;
  t.groupMatchIndex += 1;

  if (t.groupMatchIndex >= t.groupOpponents.length) {
    finalizeGroupStage(state, position);
  }

  return result;
}

function finalizeGroupStage(state: PlayerState, position: Position): void {
  const t = state.activeTournament!;
  // Simule les matchs entre adversaires (ne concernent pas le joueur) pour compléter le tableau.
  const opponents = t.groupOpponents;
  for (let i = 0; i < opponents.length; i++) {
    for (let j = i + 1; j < opponents.length; j++) {
      const a = t.groupTable.find((s) => s.countryCode === opponents[i])!;
      const b = t.groupTable.find((s) => s.countryCode === opponents[j])!;
      const ca = getCountry(opponents[i]);
      const cb = getCountry(opponents[j]);
      const diff = clamp(TIER_STRENGTH[ca.tier] - TIER_STRENGTH[cb.tier], -6, 6);
      const goalsA = poissonish(state, clamp(1.3 + diff * 0.2, 0.2, 4));
      const goalsB = poissonish(state, clamp(1.3 - diff * 0.2, 0.2, 4));
      const won = goalsA > goalsB;
      const draw = goalsA === goalsB;
      recordTeamResult(a, goalsA, goalsB, won, draw);
      recordTeamResult(b, goalsB, goalsA, !won && !draw, draw);
    }
  }

  const ranked = [...t.groupTable].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor);
  t.groupTable = ranked;
  const playerRank = ranked.findIndex((s) => s.isPlayerTeam);

  if (playerRank <= 1) {
    t.stage = 'huitiemes';
    t.finalStageLabel = loc(state, 'Huitièmes de finale', 'Round of 16');
  } else {
    t.stage = 'termine';
    t.eliminated = true;
    t.finalStageLabel = loc(state, 'Éliminé en phase de groupes', 'Eliminated in the group stage');
    finalizeTournament(state, position);
  }
}

// ---------------- Élimination directe ----------------

const KNOCKOUT_SEQUENCE: { stage: TournamentState['stage']; label: string; labelEn: string; next: TournamentState['stage'] }[] = [
  { stage: 'huitiemes', label: 'Huitième de finale', labelEn: 'Round of 16', next: 'quarts' },
  { stage: 'quarts', label: 'Quart de finale', labelEn: 'Quarter-final', next: 'demies' },
  { stage: 'demies', label: 'Demi-finale', labelEn: 'Semi-final', next: 'finale' },
  { stage: 'finale', label: 'Finale', labelEn: 'Final', next: 'termine' },
];

export function playKnockoutMatch(state: PlayerState, position: Position): TournamentMatchResult {
  const t = state.activeTournament!;
  const step = KNOCKOUT_SEQUENCE.find((s) => s.stage === t.stage)!;
  const opponentCode = pickOpponents(state, [state.countryCode, ...t.faced], 1)[0];

  const result = simulateMatch(state, position, opponentCode, loc(state, step.label, step.labelEn), true);
  t.matches.push(result);
  t.playerGoals += result.playerGoals;
  t.playerAssists += result.playerAssists;
  t.playerRatings.push(result.playerRating);
  t.faced.push(opponentCode);
  state.caps += 1;
  state.capGoals += result.playerGoals;

  const won = result.wonOnPenalties !== undefined ? result.wonOnPenalties : result.scoreFor > result.scoreAgainst;

  if (!won) {
    t.stage = 'termine';
    t.eliminated = true;
    t.finalStageLabel = loc(state, `Éliminé en ${step.label.toLowerCase()}`, `Eliminated in the ${step.labelEn.toLowerCase()}`);
    finalizeTournament(state, position);
  } else if (step.stage === 'finale') {
    t.stage = 'termine';
    t.champion = true;
    t.finalStageLabel = loc(state, 'Vainqueur du tournoi !', 'Tournament winner!');
    finalizeTournament(state, position);
  } else {
    t.stage = step.next;
    const nextStep = KNOCKOUT_SEQUENCE.find((s) => s.stage === step.next);
    t.finalStageLabel = nextStep ? loc(state, nextStep.label, nextStep.labelEn) : t.finalStageLabel;
  }

  return result;
}

// ---------------- Bilan et classements ----------------

function finalizeTournament(state: PlayerState, position: Position): void {
  const t = state.activeTournament!;
  const playerCountry = getCountry(state.countryCode);
  const playerCountryName = loc(state, playerCountry.name, playerCountry.nameEn);

  // Rivaux fictifs (nom généré, pas de joueurs réels) pour donner du relief aux classements.
  const rivalPool = Array.from(new Set([...t.groupOpponents, ...t.faced])).filter((c) => c !== state.countryCode);
  const rivals: TournamentRivalStat[] = rivalPool.slice(0, 10).map((code) => {
    const country = getCountry(code);
    const name = randomName(code, rngFromCarrier(state));
    const strength = TIER_STRENGTH[country.tier];
    const goals = Math.max(0, Math.round(strength * 0.6 + nextInt(state, 0, 4)));
    const assists = Math.max(0, Math.round(strength * 0.4 + nextInt(state, 0, 3)));
    const avgRating = clamp(6 + strength * 0.15 + (nextFloat(state) - 0.3) * 0.8, 5.5, 9.2);
    return {
      name: `${name.firstName} ${name.lastName}`,
      countryCode: code,
      countryName: loc(state, country.name, country.nameEn),
      goals,
      assists,
      avgRating: Math.round(avgRating * 10) / 10,
    };
  });
  t.rivals = rivals;

  const avgPlayerRating = t.playerRatings.length > 0 ? t.playerRatings.reduce((a, b) => a + b, 0) / t.playerRatings.length : 0;

  const goldenBootRank = 1 + rivals.filter((r) => r.goals > t.playerGoals).length;
  const playmakerRank = 1 + rivals.filter((r) => r.assists > t.playerAssists).length;
  const bestPlayerRank = 1 + rivals.filter((r) => r.avgRating > avgPlayerRating).length;

  const overall = computeOverall(state, position);
  // t.matches.length > groupOpponents.length signifie qu'au moins un match à élimination directe a
  // été disputé (indépendant de la langue du libellé affiché, contrairement à un test sur le texte).
  const reachedKnockouts = t.matches.length > t.groupOpponents.length;
  adjustReputation(state, t.champion ? 16 : reachedKnockouts ? 8 : 3);

  if (t.champion) {
    state.trophies.push(
      loc(
        state,
        `${t.tournamentName} — saison ${state.season} (sélection ${playerCountryName})`,
        `${t.tournamentName} — season ${state.season} (${playerCountryName} national team)`,
      ),
    );
  }
  if (goldenBootRank === 1 && t.playerGoals > 0) {
    state.majorAwards.push(
      loc(
        state,
        `Meilleur buteur du tournoi (${t.tournamentName}) — saison ${state.season}`,
        `Tournament top scorer (${t.tournamentName}) — season ${state.season}`,
      ),
    );
  }
  if (playmakerRank === 1 && t.playerAssists > 0) {
    state.majorAwards.push(
      loc(
        state,
        `Meilleur passeur du tournoi (${t.tournamentName}) — saison ${state.season}`,
        `Tournament top playmaker (${t.tournamentName}) — season ${state.season}`,
      ),
    );
  }
  if (bestPlayerRank === 1 && t.playerRatings.length >= 3) {
    state.majorAwards.push(
      loc(
        state,
        `Meilleur joueur du tournoi (${t.tournamentName}) — saison ${state.season}`,
        `Tournament best player (${t.tournamentName}) — season ${state.season}`,
      ),
    );
  }

  state.careerGoals += 0; // les buts de tournoi sont déjà comptés via capGoals/caps, pas les stats club
  state.playedTournamentThisSeason = true;

  void overall;
}

export function goldenBootRank(t: TournamentState): number {
  return 1 + t.rivals.filter((r) => r.goals > t.playerGoals).length;
}

export function playmakerRank(t: TournamentState): number {
  return 1 + t.rivals.filter((r) => r.assists > t.playerAssists).length;
}

export function bestPlayerRank(t: TournamentState): number {
  const avg = t.playerRatings.length > 0 ? t.playerRatings.reduce((a, b) => a + b, 0) / t.playerRatings.length : 0;
  return 1 + t.rivals.filter((r) => r.avgRating > avg).length;
}

export function averagePlayerRating(t: TournamentState): number {
  return t.playerRatings.length > 0 ? Math.round((t.playerRatings.reduce((a, b) => a + b, 0) / t.playerRatings.length) * 10) / 10 : 0;
}
