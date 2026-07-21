// Pays de départ : chaque nation influence directement la difficulté de la carrière.
// - competition      : densité de talents nationaux à devancer pour percer (académies, concurrence aux postes)
// - infrastructure   : qualité des structures (centres de formation, staff médical) -> vitesse de progression, blessures
// - scouting         : exposition aux recruteurs -> fréquence/qualité des offres de club
// - leagueStrength   : niveau du championnat national accessible en debut de carriere
// - nationalTeamAccess : facilite a etre selectionne/capitaine en equipe nationale (souvent l'inverse de la concurrence)
export type CountryTier = 'S' | 'A' | 'B' | 'C' | 'D';

export type PopulationSize = 'grand' | 'moyen' | 'petit' | 'micro';

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  tier: CountryTier;
  competition: number; // 1-10
  infrastructure: number; // 1-10
  scouting: number; // 1-10
  leagueStrength: number; // 1-10
  nationalTeamAccess: number; // 1-10
  population: PopulationSize;
}

// EN (Angleterre) et WA (Pays de Galles) ne sont pas des codes ISO 3166-1 : aucune paire
// de lettres régionales ne produit leur drapeau, on utilise donc les séquences Unicode dédiées.
const FLAG_OVERRIDES: Record<string, string> = {
  EN: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  WA: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
};

export function flagEmoji(code: string): string {
  const upper = code.toUpperCase();
  if (FLAG_OVERRIDES[upper]) return FLAG_OVERRIDES[upper];
  return upper.replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export const TIER_INFO: Record<CountryTier, {
  label: string;
  difficulty: string;
  color: string;
  description: string;
}> = {
  S: {
    label: 'Nation majeure',
    difficulty: 'Très difficile',
    color: '#e8b94a',
    description:
      "Vivier de talents immense et académies de pointe : tu progresseras vite si tu perces, mais la concurrence pour une place en sélection nationale est féroce.",
  },
  A: {
    label: 'Nation solide',
    difficulty: 'Difficile',
    color: '#8fd0a6',
    description:
      "Un championnat compétitif et des structures sérieuses. La concurrence reste forte mais une place en sélection est atteignable avec du travail.",
  },
  B: {
    label: 'Nation intermédiaire',
    difficulty: 'Modérée',
    color: '#9cc4e4',
    description:
      "Infrastructures correctes et concurrence raisonnable : un bon équilibre pour émerger, à condition d'aller chercher l'exposition internationale.",
  },
  C: {
    label: 'Petite nation',
    difficulty: 'Accessible',
    color: '#c9a6e4',
    description:
      "Peu de concurrence pour percer et rejoindre la sélection nationale, mais un championnat faible et peu de recruteurs : il faudra t'exiler tôt pour progresser.",
  },
  D: {
    label: 'Micro-nation',
    difficulty: 'Extrême (plafond bas)',
    color: '#e48a8a',
    description:
      "Quasiment aucune concurrence : tu peux devenir international, voire capitaine, dès ton plus jeune âge. Mais sans infrastructures ni recruteurs, atteindre le haut niveau mondial relève de l'exploit — tout se jouera sur tes choix d'exil.",
  },
};

function c(
  code: string,
  name: string,
  tier: CountryTier,
  competition: number,
  infrastructure: number,
  scouting: number,
  leagueStrength: number,
  nationalTeamAccess: number,
  population: PopulationSize,
): Country {
  return { code, name, tier, competition, infrastructure, scouting, leagueStrength, nationalTeamAccess, population };
}

export const COUNTRIES: Country[] = [
  // ---- Tier S : nations majeures ----
  c('BR', 'Brésil', 'S', 10, 9, 10, 9, 2, 'grand'),
  c('FR', 'France', 'S', 10, 10, 10, 10, 2, 'grand'),
  c('AR', 'Argentine', 'S', 9, 8, 9, 8, 2, 'grand'),
  c('ES', 'Espagne', 'S', 9, 10, 10, 10, 3, 'grand'),
  c('DE', 'Allemagne', 'S', 9, 10, 9, 9, 3, 'grand'),
  c('EN', 'Angleterre', 'S', 10, 10, 10, 10, 2, 'grand'),
  c('PT', 'Portugal', 'S', 8, 9, 9, 8, 3, 'moyen'),
  c('IT', 'Italie', 'S', 9, 9, 9, 9, 3, 'grand'),
  c('NL', 'Pays-Bas', 'S', 8, 9, 9, 8, 3, 'moyen'),
  c('BE', 'Belgique', 'S', 8, 9, 9, 7, 3, 'moyen'),

  // ---- Tier A : nations solides ----
  c('HR', 'Croatie', 'A', 7, 7, 7, 6, 4, 'petit'),
  c('UY', 'Uruguay', 'A', 7, 6, 7, 6, 4, 'petit'),
  c('CO', 'Colombie', 'A', 7, 6, 7, 6, 4, 'moyen'),
  c('MX', 'Mexique', 'A', 7, 7, 6, 7, 4, 'grand'),
  c('US', 'États-Unis', 'A', 6, 8, 6, 6, 5, 'grand'),
  c('MA', 'Maroc', 'A', 7, 6, 7, 6, 4, 'moyen'),
  c('SN', 'Sénégal', 'A', 6, 5, 7, 4, 5, 'moyen'),
  c('NG', 'Nigeria', 'A', 7, 5, 6, 4, 4, 'grand'),
  c('GH', 'Ghana', 'A', 6, 5, 6, 4, 5, 'moyen'),
  c('CI', "Côte d'Ivoire", 'A', 6, 5, 6, 4, 5, 'moyen'),
  c('RS', 'Serbie', 'A', 6, 7, 7, 6, 4, 'petit'),
  c('PL', 'Pologne', 'A', 6, 7, 6, 6, 5, 'moyen'),
  c('DK', 'Danemark', 'A', 6, 8, 7, 6, 5, 'petit'),
  c('SE', 'Suède', 'A', 6, 8, 7, 6, 5, 'petit'),
  c('CH', 'Suisse', 'A', 6, 8, 7, 7, 5, 'petit'),
  c('AT', 'Autriche', 'A', 6, 7, 6, 6, 5, 'petit'),
  c('WA', 'Pays de Galles', 'A', 5, 6, 6, 4, 6, 'petit'),
  c('UA', 'Ukraine', 'A', 6, 6, 6, 5, 5, 'moyen'),
  c('JP', 'Japon', 'A', 7, 8, 6, 6, 4, 'grand'),
  c('KR', 'Corée du Sud', 'A', 7, 8, 6, 6, 4, 'grand'),
  c('EG', 'Égypte', 'A', 6, 5, 6, 5, 5, 'grand'),
  c('DZ', 'Algérie', 'A', 6, 5, 6, 5, 5, 'moyen'),
  c('TN', 'Tunisie', 'A', 5, 5, 6, 4, 5, 'petit'),
  c('CL', 'Chili', 'A', 6, 6, 6, 5, 5, 'moyen'),
  c('EC', 'Équateur', 'A', 5, 5, 6, 4, 5, 'moyen'),
  c('PE', 'Pérou', 'A', 5, 5, 6, 4, 5, 'moyen'),
  c('TR', 'Turquie', 'A', 6, 7, 6, 6, 5, 'grand'),
  c('GR', 'Grèce', 'A', 5, 6, 6, 5, 5, 'petit'),
  c('CZ', 'Tchéquie', 'A', 5, 6, 6, 5, 5, 'petit'),

  // ---- Tier B : nations intermédiaires ----
  c('IS', 'Islande', 'B', 3, 6, 5, 4, 8, 'micro'),
  c('FI', 'Finlande', 'B', 4, 6, 5, 4, 6, 'petit'),
  c('NO', 'Norvège', 'B', 5, 7, 6, 5, 6, 'petit'),
  c('IE', 'Irlande', 'B', 4, 6, 6, 4, 6, 'petit'),
  c('SK', 'Slovaquie', 'B', 4, 5, 5, 4, 6, 'petit'),
  c('SI', 'Slovénie', 'B', 4, 5, 5, 4, 6, 'petit'),
  c('HU', 'Hongrie', 'B', 4, 5, 5, 4, 6, 'petit'),
  c('RO', 'Roumanie', 'B', 5, 5, 5, 4, 6, 'moyen'),
  c('BG', 'Bulgarie', 'B', 4, 4, 5, 3, 6, 'petit'),
  c('BA', 'Bosnie-Herzégovine', 'B', 4, 4, 5, 3, 6, 'petit'),
  c('MK', 'Macédoine du Nord', 'B', 3, 4, 4, 3, 7, 'petit'),
  c('AL', 'Albanie', 'B', 3, 4, 4, 3, 7, 'petit'),
  c('IL', 'Israël', 'B', 4, 6, 5, 4, 6, 'petit'),
  c('IR', 'Iran', 'B', 6, 5, 5, 5, 4, 'grand'),
  c('SA', 'Arabie Saoudite', 'B', 5, 7, 5, 6, 5, 'grand'),
  c('QA', 'Qatar', 'B', 3, 8, 5, 5, 7, 'micro'),
  c('AE', 'Émirats Arabes Unis', 'B', 3, 7, 5, 5, 7, 'petit'),
  c('AU', 'Australie', 'B', 5, 6, 4, 4, 6, 'grand'),
  c('NZ', 'Nouvelle-Zélande', 'B', 2, 5, 3, 3, 8, 'petit'),
  c('CA', 'Canada', 'B', 4, 6, 4, 4, 6, 'grand'),
  c('CR', 'Costa Rica', 'B', 3, 4, 4, 3, 7, 'petit'),
  c('JM', 'Jamaïque', 'B', 3, 4, 4, 3, 7, 'petit'),
  c('PA', 'Panama', 'B', 3, 4, 4, 3, 7, 'petit'),
  c('HN', 'Honduras', 'B', 3, 3, 3, 3, 7, 'petit'),
  c('ZA', 'Afrique du Sud', 'B', 5, 5, 4, 4, 6, 'grand'),
  c('CM', 'Cameroun', 'B', 5, 4, 5, 3, 6, 'moyen'),
  c('ML', 'Mali', 'B', 4, 3, 5, 2, 6, 'petit'),
  c('BF', 'Burkina Faso', 'B', 4, 3, 4, 2, 6, 'petit'),
  c('CD', 'RD Congo', 'B', 4, 3, 4, 2, 6, 'grand'),
  c('ZM', 'Zambie', 'B', 3, 3, 3, 2, 7, 'petit'),
  c('UG', 'Ouganda', 'B', 3, 3, 3, 2, 7, 'petit'),
  c('KE', 'Kenya', 'B', 3, 3, 3, 2, 7, 'petit'),
  c('CN', 'Chine', 'B', 5, 7, 4, 5, 5, 'grand'),
  c('IN', 'Inde', 'B', 3, 4, 3, 3, 7, 'grand'),
  c('VN', 'Vietnam', 'B', 3, 4, 3, 3, 7, 'moyen'),
  c('TH', 'Thaïlande', 'B', 3, 4, 3, 3, 7, 'moyen'),
  c('ID', 'Indonésie', 'B', 3, 3, 3, 3, 7, 'grand'),

  // ---- Tier C : petites nations ----
  c('EE', 'Estonie', 'C', 2, 3, 2, 2, 8, 'petit'),
  c('LV', 'Lettonie', 'C', 2, 3, 2, 2, 8, 'petit'),
  c('LT', 'Lituanie', 'C', 2, 3, 2, 2, 8, 'petit'),
  c('GE', 'Géorgie', 'C', 2, 3, 3, 2, 8, 'petit'),
  c('AM', 'Arménie', 'C', 2, 3, 3, 2, 8, 'petit'),
  c('AZ', 'Azerbaïdjan', 'C', 2, 4, 3, 3, 8, 'petit'),
  c('MD', 'Moldavie', 'C', 2, 2, 2, 2, 8, 'petit'),
  c('BY', 'Biélorussie', 'C', 3, 4, 3, 3, 7, 'petit'),
  c('CY', 'Chypre', 'C', 2, 4, 3, 3, 8, 'petit'),
  c('ME', 'Monténégro', 'C', 2, 3, 3, 2, 8, 'petit'),
  c('XK', 'Kosovo', 'C', 2, 3, 3, 2, 8, 'petit'),
  c('BO', 'Bolivie', 'C', 3, 3, 3, 3, 7, 'moyen'),
  c('VE', 'Venezuela', 'C', 3, 3, 3, 3, 7, 'moyen'),
  c('SV', 'Salvador', 'C', 2, 2, 2, 2, 8, 'petit'),
  c('GT', 'Guatemala', 'C', 2, 2, 2, 2, 8, 'petit'),
  c('TT', 'Trinité-et-Tobago', 'C', 2, 3, 2, 2, 8, 'micro'),
  c('HT', 'Haïti', 'C', 3, 2, 2, 2, 7, 'petit'),
  c('ZW', 'Zimbabwe', 'C', 3, 2, 2, 2, 7, 'petit'),
  c('BW', 'Botswana', 'C', 2, 2, 2, 2, 8, 'micro'),
  c('NA', 'Namibie', 'C', 2, 2, 2, 2, 8, 'micro'),
  c('RW', 'Rwanda', 'C', 2, 2, 2, 1, 8, 'petit'),
  c('BJ', 'Bénin', 'C', 2, 2, 2, 1, 8, 'petit'),
  c('TG', 'Togo', 'C', 2, 2, 2, 1, 8, 'micro'),
  c('GA', 'Gabon', 'C', 2, 3, 2, 2, 8, 'micro'),
  c('CG', 'Congo', 'C', 2, 2, 2, 1, 8, 'micro'),
  c('MG', 'Madagascar', 'C', 2, 2, 2, 1, 8, 'petit'),
  c('MU', 'Maurice', 'C', 1, 3, 2, 1, 9, 'micro'),
  c('NP', 'Népal', 'C', 2, 2, 1, 1, 8, 'petit'),
  c('BD', 'Bangladesh', 'C', 3, 2, 1, 2, 7, 'grand'),
  c('KH', 'Cambodge', 'C', 2, 2, 1, 1, 8, 'petit'),
  c('MN', 'Mongolie', 'C', 1, 2, 1, 1, 9, 'micro'),
  c('CV', 'Cap-Vert', 'C', 2, 3, 3, 2, 8, 'micro'),

  // ---- Tier D : micro-nations (plafond très bas, sélection quasi garantie) ----
  c('SM', 'Saint-Marin', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('AD', 'Andorre', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('LI', 'Liechtenstein', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('GI', 'Gibraltar', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('FO', 'Îles Féroé', 'D', 1, 2, 1, 1, 10, 'micro'),
  c('MT', 'Malte', 'D', 1, 2, 2, 1, 9, 'micro'),
  c('LU', 'Luxembourg', 'D', 1, 3, 2, 1, 9, 'micro'),
  c('BT', 'Bhoutan', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('BN', 'Brunei', 'D', 1, 2, 1, 1, 10, 'micro'),
  c('KM', 'Comores', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('SZ', 'Eswatini', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('LS', 'Lesotho', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('SC', 'Seychelles', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('ST', 'Sao Tomé-et-Principe', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('TL', 'Timor Oriental', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('AS', 'Samoa Américaines', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('CK', 'Îles Cook', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('AI', 'Anguilla', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('DJ', 'Djibouti', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('SO', 'Somalie', 'D', 1, 1, 1, 1, 10, 'micro'),
];

export function getCountry(code: string): Country {
  const found = COUNTRIES.find((country) => country.code === code);
  if (!found) throw new Error(`Pays inconnu: ${code}`);
  return found;
}

export const COUNTRIES_BY_TIER: Record<CountryTier, Country[]> = {
  S: COUNTRIES.filter((x) => x.tier === 'S'),
  A: COUNTRIES.filter((x) => x.tier === 'A'),
  B: COUNTRIES.filter((x) => x.tier === 'B'),
  C: COUNTRIES.filter((x) => x.tier === 'C'),
  D: COUNTRIES.filter((x) => x.tier === 'D'),
};
