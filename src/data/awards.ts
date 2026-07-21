// Distinctions individuelles majeures et tournois internationaux (contenu original,
// noms non déposés — pas de référence à des trophées ou compétitions réels).
export const WORLD_PLAYER_AWARD = 'Meilleur joueur mondial de la saison';
export const TOP_SCORER_AWARD = 'Meilleur buteur de la saison';
export const TEAM_OF_YEAR_AWARD = 'Équipe-type mondiale de la saison';

export const GLOBAL_TOURNAMENT_NAME = 'Coupe Intercontinentale';
export const CONTINENTAL_TOURNAMENT_NAME = 'Championnat Continental';

export interface InjuryType {
  id: string;
  label: string;
  minMatchesOut: number;
  maxMatchesOut: number;
  permanentDecayChance: number; // probabilité de séquelle définitive
  weight: number;
}

export const INJURY_TYPES: InjuryType[] = [
  { id: 'gene_musculaire', label: 'gêne musculaire', minMatchesOut: 1, maxMatchesOut: 3, permanentDecayChance: 0, weight: 6 },
  { id: 'entorse', label: 'entorse de la cheville', minMatchesOut: 2, maxMatchesOut: 6, permanentDecayChance: 0.03, weight: 5 },
  { id: 'ischios', label: 'lésion aux ischio-jambiers', minMatchesOut: 3, maxMatchesOut: 8, permanentDecayChance: 0.06, weight: 3 },
  { id: 'fracture', label: 'fracture osseuse', minMatchesOut: 8, maxMatchesOut: 16, permanentDecayChance: 0.15, weight: 2 },
  { id: 'ligaments', label: 'rupture des ligaments croisés', minMatchesOut: 20, maxMatchesOut: 34, permanentDecayChance: 0.35, weight: 1 },
];
