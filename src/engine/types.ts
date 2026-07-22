import type { AttributeKey, PositionCode } from '../data/positions';
import type { ClubRef } from '../data/clubs';

export const START_AGE = 16;
export const MAX_AGE = 45; // Age maximal (carte blanche : porté de 36 à 45 ans)

export interface SeasonRecord {
  season: number; // 1-based
  age: number;
  clubName: string;
  clubTierIndex: number;
  divisionName: string; // vrai nom de division si connu, sinon libellé générique du palier
  countryCode: string;
  appearances: number;
  goals: number;
  assists: number;
  cleanSheets: number; // gardiens uniquement
  saves: number; // gardiens uniquement
  avgRating: number; // 0-10
  trophies: string[];
  majorAwards: string[]; // distinctions individuelles remportées cette saison
  caps: number;
  capGoals: number;
  captainThisSeason: boolean;
  overall: number;
  marketValue: number;
  wage: number;
  cardsYellow: number;
  cardsRed: number;
  injuryNote?: string;
  narrative: string[]; // résumé texte des évènements marquants de la saison
}

export interface TransferOffer {
  clubName: string;
  tierIndex: number;
  countryCode: string;
  wage: number;
  signingBonus: number;
  role: 'titulaire' | 'rotation' | 'reserviste';
  releaseClause?: number;
  negotiated?: boolean;
  divisionLevel?: number; // niveau réel dans la pyramide du pays, si connue (1 = sommet)
}

// Style de jeu choisi par le joueur en début de simulation de saison : influence directement
// les résultats (buts/passes, cartons, blessures, clean sheets) au lieu de subir la saison passivement.
export type PlayStyle = 'offensif' | 'defensif' | 'equilibre';

export type CareerPhase =
  | 'preseason'
  | 'event'
  | 'mid_season'
  | 'tournament_invite'
  | 'tournament'
  | 'season_sim'
  | 'transfer_window'
  | 'season_end'
  | 'retired';

export interface StatDelta {
  key: string;
  label: string;
  icon: string;
  delta: number;
  isMoney?: boolean;
}

export interface EventChoiceOutcome {
  label: string; // texte du choix affiché
  // Applique l'effet ET renvoie le texte de résultat (peut dépendre d'un tirage aléatoire
  // effectué au moment de la décision, donc calculé ici plutôt qu'à l'avance).
  apply: (state: PlayerState) => string;
}

export interface EventOccurrence {
  id: string;
  title: string;
  text: string;
  choices: EventChoiceOutcome[];
}

// Représentation sérialisable (sans closures) de l'évènement en attente d'une décision.
export interface PendingEvent {
  templateId: string;
  title: string;
  text: string;
  choices: { label: string }[];
}

// ---------------- Vie personnelle : patrimoine et relation ----------------

export type InvestmentId =
  | 'livret'
  | 'obligations'
  | 'or'
  | 'immobilier'
  | 'actions'
  | 'art'
  | 'startups'
  | 'bitcoin'
  | 'ethereum'
  | 'solana'
  | 'bnb'
  | 'xrp'
  | 'cardano'
  | 'polkadot'
  | 'dogecoin'
  | 'litecoin'
  | 'chainlink'
  | 'avalanche'
  | 'toncoin'
  | 'tron'
  | 'shiba_inu'
  | 'pepe'
  | 'moonshiba';

export interface InvestmentHolding {
  id: InvestmentId;
  principal: number; // total misé net des retraits, pour situer le gain/perte
  value: number; // valeur actuelle, fluctue chaque saison
}

// Profil de risque/rendement effectif d'un actif POUR CETTE CARRIÈRE : dérivé aléatoirement (via le
// RNG seedé) des valeurs de base de l'actif à la création du personnage, pour que le marché ne soit
// jamais identique d'une partie à l'autre.
export interface MarketAssetProfile {
  volatility: number;
  meanReturn: number;
  crashChance: number;
}

export type RelationshipStatus = 'celibataire' | 'en_couple' | 'marie';

export interface RelationshipState {
  status: RelationshipStatus;
  partnerName: string | null;
  since: number; // saison de début du statut actuel
  happiness: number; // 0-100
}

// ---------------- Tournoi international détaillé ----------------

export type TournamentStageKey =
  | 'groupes'
  | 'huitiemes'
  | 'quarts'
  | 'demies'
  | 'petite_finale'
  | 'finale'
  | 'termine';

export interface PendingTournamentInvite {
  tournamentName: string;
}

export interface TournamentTeamStanding {
  countryCode: string;
  countryName: string;
  isPlayerTeam: boolean;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface TournamentMatchTimelineEvent {
  minuteLabel: string;
  text: string;
  isPlayerInvolved?: boolean;
}

export interface TournamentMatchResult {
  roundLabel: string;
  opponentCountryCode: string;
  opponentCountryName: string;
  scoreFor: number;
  scoreAgainst: number;
  wonOnPenalties?: boolean;
  playerGoals: number;
  playerAssists: number;
  playerRating: number;
  narrative: string;
  timeline: TournamentMatchTimelineEvent[];
}

export interface TournamentRivalStat {
  name: string;
  countryCode: string;
  countryName: string;
  goals: number;
  assists: number;
  avgRating: number;
}

// ---------------- Rivalité de vestiaire persistante ----------------

export interface LockerRoomRival {
  name: string;
  emergedSeason: number;
  intensity: number; // 0-100 : monte avec les provocations, descend avec les tentatives d'apaisement
}

export interface TournamentState {
  tournamentName: string;
  stage: TournamentStageKey;
  groupOpponents: string[]; // codes pays, 3 adversaires de poule
  groupMatchIndex: number; // 0-2, prochain match de poule à disputer
  groupTable: TournamentTeamStanding[];
  matches: TournamentMatchResult[]; // historique complet, dans l'ordre chronologique
  eliminated: boolean;
  champion: boolean;
  finalStageLabel: string;
  playerGoals: number;
  playerAssists: number;
  playerRatings: number[];
  rivals: TournamentRivalStat[];
  faced: string[]; // codes pays déjà affrontés (poule + élimination directe), pour éviter les doublons
}

export interface PlayerState {
  firstName: string;
  lastName: string;
  countryCode: string;
  positionCode: PositionCode;
  backgroundId: string;
  lifestyleId: string;
  agentId: string;

  seed: number; // seed d'origine (affichable/partageable, ex. défi entre amis)
  rngState: number; // état courant du générateur aléatoire (avance à chaque tirage)
  mode: 'classic' | 'daily' | 'friend' | 'story';

  age: number;
  season: number; // 1-based, saison en cours
  phase: CareerPhase;

  attributes: Record<AttributeKey, number>;
  potential: Record<AttributeKey, number>;

  morale: number;
  fitness: number;
  discipline: number;
  reputation: number;
  form: number;

  marketValue: number;
  wage: number;
  club: ClubRef | null;

  caps: number;
  capGoals: number;
  captain: boolean;
  ballonsAttempts: number; // nombre de fois nominé pour la distinction de meilleur joueur mondial
  nationalTeamDoorClosed: boolean; // sortie médiatique ratée : le sélectionneur t'écarte définitivement

  careerGoals: number;
  careerAssists: number;
  careerAppearances: number;
  careerInjuries: number;
  careerCleanSheets: number;
  careerSaves: number;
  careerYellowCards: number;
  careerRedCards: number;
  trophies: string[];
  awards: string[];
  majorAwards: string[]; // distinctions individuelles majeures remportées (meilleur joueur, meilleur buteur...)
  consumables: string[]; // objets consommables de la boutique actuellement détenus

  pendingTournamentInvite: PendingTournamentInvite | null;
  activeTournament: TournamentState | null;
  playedTournamentThisSeason: boolean;
  rival: LockerRoomRival | null;

  savings: number; // argent personnel liquide, distinct du salaire et de la valeur marchande
  investments: Partial<Record<InvestmentId, InvestmentHolding>>;
  marketProfile: Record<InvestmentId, MarketAssetProfile>;
  relationship: RelationshipState;
  prestigeAssets: string[]; // ids des résidences/objets de prestige achetés (uniques, non revendables)
  reputationShield: number; // 0-1, réduit l'ampleur des pertes de réputation (achats de prestige)

  history: SeasonRecord[];
  seenClubNames: string[]; // clubs déjà proposés ou fréquentés, pour ne pas les reproposer après un refus
  pendingOffers: TransferOffer[];
  pendingEvent: PendingEvent | null;
  eventsRemainingThisSeason: number;
  recentEventIds: string[];
  firedOnceEventIds: string[]; // évènements à scénario unique déjà déclenchés cette carrière
  focusAttribute?: AttributeKey;
  seasonLog: string[];
  lastSeasonNarrative: string[];
  lastGrowthDeltas: StatDelta[];

  retired: boolean;
  retirementReason?: string;
  finalized: boolean; // empêche un double octroi de jetons/badges après un rechargement de page

  advantagesEquipped: string[]; // ids d'avantages de la boutique actifs pour cette carrière
  advantageEffects: Partial<Record<import('../data/shop').AdvantageEffect, number>>; // valeurs résolues une fois pour toutes (niveau au moment du lancement)
  seasonGrowthBoostValue: number; // bonus temporaire de progression (objet consommable), remis à 0 après usage
}

export function overallRating(
  attributes: Record<AttributeKey, number>,
  weights: Record<AttributeKey, number>,
): number {
  let sum = 0;
  let weightSum = 0;
  for (const key of Object.keys(weights) as AttributeKey[]) {
    const weight = weights[key];
    if (weight <= 0) continue; // attribut sans influence pour ce poste (ex. reflexes hors gardien)
    sum += attributes[key] * weight;
    weightSum += weight;
  }
  return weightSum > 0 ? Math.round((sum / weightSum) * 10) / 10 : 0;
}
