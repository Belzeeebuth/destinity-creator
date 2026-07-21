import type { Rng } from '../engine/rng';
import { pick } from '../engine/rng';

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

const CITY_ROOTS = [
  'Val', 'Mont', 'Port', 'Saint', 'Nova', 'Rio', 'Costa', 'Alto', 'Belle', 'Fort',
  'San', 'Nord', 'Sud', 'Grand', 'Cabo', 'Lago', 'Serra', 'Baie', 'Campo', 'Isla',
];
const CITY_SUFFIXES = [
  'ville', 'port', 'field', 'burgo', 'stad', 'grande', 'nova', 'wick', 'thorpe', 'dor',
  'mar', 'bosco', 'monte', 'rio', 'land', 'ora', 'ense', 'inha', 'ez', 'ington',
];

export function generateCityName(rng: Rng): string {
  const root = pick(rng, CITY_ROOTS);
  const suffix = pick(rng, CITY_SUFFIXES);
  return `${root}${suffix}`;
}

const CLUB_TEMPLATES = [
  'FC {city}', '{city} FC', 'Racing {city}', 'Olympique {city}', '{city} United',
  '{city} Athletic', 'AS {city}', 'Real {city}', 'Sporting {city}', '{city} City',
  'Dynamo {city}', '{city} Rovers', 'Étoile de {city}', 'Union {city}', '{city} Wanderers',
];

export function generateClubName(rng: Rng): string {
  const city = generateCityName(rng);
  const template = pick(rng, CLUB_TEMPLATES);
  return template.replace('{city}', city);
}

export interface ClubRef {
  name: string;
  tierIndex: number;
  countryCode: string;
}

export function getClubTier(index: number): ClubTier {
  return CLUB_TIERS[Math.max(0, Math.min(CLUB_TIERS.length - 1, index))];
}
