// Distinctions individuelles majeures et tournois internationaux (contenu original,
// noms non déposés — pas de référence à des trophées ou compétitions réels).
export const WORLD_PLAYER_AWARD = 'Meilleur joueur mondial de la saison';
export const WORLD_PLAYER_AWARD_EN = 'World Player of the Season';
export const TOP_SCORER_AWARD = 'Meilleur buteur de la saison';
export const TOP_SCORER_AWARD_EN = 'Top Scorer of the Season';
export const TEAM_OF_YEAR_AWARD = 'Équipe-type mondiale de la saison';
export const TEAM_OF_YEAR_AWARD_EN = 'World Team of the Season';

export const GLOBAL_TOURNAMENT_NAME = 'Coupe Intercontinentale';
export const GLOBAL_TOURNAMENT_NAME_EN = 'Intercontinental Cup';
export const CONTINENTAL_TOURNAMENT_NAME = 'Championnat Continental';
export const CONTINENTAL_TOURNAMENT_NAME_EN = 'Continental Championship';

export interface InjuryType {
  id: string;
  label: string;
  labelEn: string;
  minMatchesOut: number;
  maxMatchesOut: number;
  permanentDecayChance: number; // probabilité de séquelle définitive
  weight: number;
}

export const INJURY_TYPES: InjuryType[] = [
  { id: 'gene_musculaire', label: 'gêne musculaire', labelEn: 'muscle strain', minMatchesOut: 1, maxMatchesOut: 3, permanentDecayChance: 0, weight: 6 },
  { id: 'entorse', label: 'entorse de la cheville', labelEn: 'ankle sprain', minMatchesOut: 2, maxMatchesOut: 6, permanentDecayChance: 0.03, weight: 5 },
  { id: 'ischios', label: 'lésion aux ischio-jambiers', labelEn: 'hamstring injury', minMatchesOut: 3, maxMatchesOut: 8, permanentDecayChance: 0.06, weight: 3 },
  { id: 'fracture', label: 'fracture osseuse', labelEn: 'bone fracture', minMatchesOut: 8, maxMatchesOut: 16, permanentDecayChance: 0.15, weight: 2 },
  { id: 'ligaments', label: 'rupture des ligaments croisés', labelEn: 'torn cruciate ligament', minMatchesOut: 20, maxMatchesOut: 34, permanentDecayChance: 0.35, weight: 1 },
];
