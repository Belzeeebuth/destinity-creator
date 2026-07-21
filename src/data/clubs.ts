export interface ClubTier {
  index: number; // 0 = sans club .. 5 = élite mondiale
  label: string;
  description: string;
  wageBase: number; // salaire annuel de référence en €
  prestige: number; // 0-100
}

export const CLUB_TIERS: ClubTier[] = [
  { index: 0, label: 'Sans club', description: 'Libre, en quête d’un premier contrat.', wageBase: 0, prestige: 0 },
  { index: 1, label: 'Club amateur', description: 'Championnat régional, entraînements le soir.', wageBase: 2000, prestige: 8 },
  { index: 2, label: 'Club semi-pro', description: 'Division nationale inférieure, premiers pas semi-professionnels.', wageBase: 15000, prestige: 20 },
  { index: 3, label: 'Club professionnel', description: 'Championnat national, milieu de tableau.', wageBase: 90000, prestige: 40 },
  { index: 4, label: 'Grand club national', description: 'Haut de tableau, coupes continentales.', wageBase: 500000, prestige: 65 },
  { index: 5, label: 'Club d’élite mondiale', description: 'Sommet du football mondial, projecteurs braqués.', wageBase: 3000000, prestige: 90 },
];

export interface ClubRef {
  name: string;
  tierIndex: number;
  countryCode: string;
  releaseClause?: number;
}

export function getClubTier(index: number): ClubTier {
  return CLUB_TIERS[Math.max(0, Math.min(CLUB_TIERS.length - 1, index))];
}
