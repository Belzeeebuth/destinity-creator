import type { AttributeKey, PositionCode } from '../data/positions';
import type { ClubRef } from '../data/clubs';

export const START_AGE = 16;
export const MAX_AGE = 45; // Age maximal (carte blanche : porté de 36 à 45 ans)

export interface SeasonRecord {
  season: number; // 1-based
  age: number;
  clubName: string;
  clubTierIndex: number;
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
}

export type CareerPhase =
  | 'preseason'
  | 'event'
  | 'mid_season'
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
  pendingMidSeasonChoice: { title: string; text: string; choices: { label: string }[] } | null;

  history: SeasonRecord[];
  seenClubNames: string[]; // clubs déjà proposés ou fréquentés, pour ne pas les reproposer après un refus
  pendingOffers: TransferOffer[];
  pendingEvent: PendingEvent | null;
  eventsRemainingThisSeason: number;
  recentEventIds: string[];
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
