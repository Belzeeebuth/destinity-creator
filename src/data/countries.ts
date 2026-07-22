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
  nameEn: string;
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
  labelEn: string;
  difficulty: string;
  difficultyEn: string;
  color: string;
  description: string;
  descriptionEn: string;
}> = {
  S: {
    label: 'Nation majeure',
    labelEn: 'Major nation',
    difficulty: 'Très difficile',
    difficultyEn: 'Very hard',
    color: '#e8b94a',
    description:
      "Vivier de talents immense et académies de pointe : tu progresseras vite si tu perces, mais la concurrence pour une place en sélection nationale est féroce.",
    descriptionEn:
      "A huge talent pool and cutting-edge academies: you'll progress fast if you break through, but competition for a national team spot is fierce.",
  },
  A: {
    label: 'Nation solide',
    labelEn: 'Solid nation',
    difficulty: 'Difficile',
    difficultyEn: 'Hard',
    color: '#8fd0a6',
    description:
      "Un championnat compétitif et des structures sérieuses. La concurrence reste forte mais une place en sélection est atteignable avec du travail.",
    descriptionEn:
      'A competitive league and serious structures. Competition stays strong but a national team spot is reachable with hard work.',
  },
  B: {
    label: 'Nation intermédiaire',
    labelEn: 'Mid-tier nation',
    difficulty: 'Modérée',
    difficultyEn: 'Moderate',
    color: '#9cc4e4',
    description:
      "Infrastructures correctes et concurrence raisonnable : un bon équilibre pour émerger, à condition d'aller chercher l'exposition internationale.",
    descriptionEn:
      'Decent infrastructure and reasonable competition: a good balance to emerge, as long as you go seek international exposure.',
  },
  C: {
    label: 'Petite nation',
    labelEn: 'Small nation',
    difficulty: 'Accessible',
    difficultyEn: 'Accessible',
    color: '#c9a6e4',
    description:
      "Peu de concurrence pour percer et rejoindre la sélection nationale, mais un championnat faible et peu de recruteurs : il faudra t'exiler tôt pour progresser.",
    descriptionEn:
      "Little competition to break through and join the national team, but a weak league and few scouts: you'll need to move abroad early to progress.",
  },
  D: {
    label: 'Micro-nation',
    labelEn: 'Micro-nation',
    difficulty: 'Extrême (plafond bas)',
    difficultyEn: 'Extreme (low ceiling)',
    color: '#e48a8a',
    description:
      "Quasiment aucune concurrence : tu peux devenir international, voire capitaine, dès ton plus jeune âge. Mais sans infrastructures ni recruteurs, atteindre le haut niveau mondial relève de l'exploit — tout se jouera sur tes choix d'exil.",
    descriptionEn:
      "Almost no competition: you can become a full international, even captain, at a very young age. But without infrastructure or scouts, reaching the world's top level is a feat in itself — everything will hinge on your choices to move abroad.",
  },
};

function c(
  code: string,
  name: string,
  nameEn: string,
  tier: CountryTier,
  competition: number,
  infrastructure: number,
  scouting: number,
  leagueStrength: number,
  nationalTeamAccess: number,
  population: PopulationSize,
): Country {
  return { code, name, nameEn, tier, competition, infrastructure, scouting, leagueStrength, nationalTeamAccess, population };
}

export const COUNTRIES: Country[] = [
  // ---- Tier S : nations majeures ----
  c('BR', 'Brésil', 'Brazil', 'S', 10, 9, 10, 9, 2, 'grand'),
  c('FR', 'France', 'France', 'S', 10, 10, 10, 10, 2, 'grand'),
  c('AR', 'Argentine', 'Argentina', 'S', 9, 8, 9, 8, 2, 'grand'),
  c('ES', 'Espagne', 'Spain', 'S', 9, 10, 10, 10, 3, 'grand'),
  c('DE', 'Allemagne', 'Germany', 'S', 9, 10, 9, 9, 3, 'grand'),
  c('EN', 'Angleterre', 'England', 'S', 10, 10, 10, 10, 2, 'grand'),
  c('PT', 'Portugal', 'Portugal', 'S', 8, 9, 9, 8, 3, 'moyen'),
  c('IT', 'Italie', 'Italy', 'S', 9, 9, 9, 9, 3, 'grand'),
  c('NL', 'Pays-Bas', 'Netherlands', 'S', 8, 9, 9, 8, 3, 'moyen'),
  c('BE', 'Belgique', 'Belgium', 'S', 8, 9, 9, 7, 3, 'moyen'),

  // ---- Tier A : nations solides ----
  c('HR', 'Croatie', 'Croatia', 'A', 7, 7, 7, 6, 4, 'petit'),
  c('UY', 'Uruguay', 'Uruguay', 'A', 7, 6, 7, 6, 4, 'petit'),
  c('CO', 'Colombie', 'Colombia', 'A', 7, 6, 7, 6, 4, 'moyen'),
  c('MX', 'Mexique', 'Mexico', 'A', 7, 7, 6, 7, 4, 'grand'),
  c('US', 'États-Unis', 'United States', 'A', 6, 8, 6, 6, 5, 'grand'),
  c('MA', 'Maroc', 'Morocco', 'A', 7, 6, 7, 6, 4, 'moyen'),
  c('SN', 'Sénégal', 'Senegal', 'A', 6, 5, 7, 4, 5, 'moyen'),
  c('NG', 'Nigeria', 'Nigeria', 'A', 7, 5, 6, 4, 4, 'grand'),
  c('GH', 'Ghana', 'Ghana', 'A', 6, 5, 6, 4, 5, 'moyen'),
  c('CI', "Côte d'Ivoire", "Ivory Coast", 'A', 6, 5, 6, 4, 5, 'moyen'),
  c('RS', 'Serbie', 'Serbia', 'A', 6, 7, 7, 6, 4, 'petit'),
  c('PL', 'Pologne', 'Poland', 'A', 6, 7, 6, 6, 5, 'moyen'),
  c('DK', 'Danemark', 'Denmark', 'A', 6, 8, 7, 6, 5, 'petit'),
  c('SE', 'Suède', 'Sweden', 'A', 6, 8, 7, 6, 5, 'petit'),
  c('CH', 'Suisse', 'Switzerland', 'A', 6, 8, 7, 7, 5, 'petit'),
  c('AT', 'Autriche', 'Austria', 'A', 6, 7, 6, 6, 5, 'petit'),
  c('WA', 'Pays de Galles', 'Wales', 'A', 5, 6, 6, 4, 6, 'petit'),
  c('UA', 'Ukraine', 'Ukraine', 'A', 6, 6, 6, 5, 5, 'moyen'),
  c('JP', 'Japon', 'Japan', 'A', 7, 8, 6, 6, 4, 'grand'),
  c('KR', 'Corée du Sud', 'South Korea', 'A', 7, 8, 6, 6, 4, 'grand'),
  c('EG', 'Égypte', 'Egypt', 'A', 6, 5, 6, 5, 5, 'grand'),
  c('DZ', 'Algérie', 'Algeria', 'A', 6, 5, 6, 5, 5, 'moyen'),
  c('TN', 'Tunisie', 'Tunisia', 'A', 5, 5, 6, 4, 5, 'petit'),
  c('CL', 'Chili', 'Chile', 'A', 6, 6, 6, 5, 5, 'moyen'),
  c('EC', 'Équateur', 'Ecuador', 'A', 5, 5, 6, 4, 5, 'moyen'),
  c('PE', 'Pérou', 'Peru', 'A', 5, 5, 6, 4, 5, 'moyen'),
  c('TR', 'Turquie', 'Turkey', 'A', 6, 7, 6, 6, 5, 'grand'),
  c('GR', 'Grèce', 'Greece', 'A', 5, 6, 6, 5, 5, 'petit'),
  c('CZ', 'Tchéquie', 'Czechia', 'A', 5, 6, 6, 5, 5, 'petit'),

  // ---- Tier B : nations intermédiaires ----
  c('IS', 'Islande', 'Iceland', 'B', 3, 6, 5, 4, 8, 'micro'),
  c('FI', 'Finlande', 'Finland', 'B', 4, 6, 5, 4, 6, 'petit'),
  c('NO', 'Norvège', 'Norway', 'B', 5, 7, 6, 5, 6, 'petit'),
  c('IE', 'Irlande', 'Ireland', 'B', 4, 6, 6, 4, 6, 'petit'),
  c('SK', 'Slovaquie', 'Slovakia', 'B', 4, 5, 5, 4, 6, 'petit'),
  c('SI', 'Slovénie', 'Slovenia', 'B', 4, 5, 5, 4, 6, 'petit'),
  c('HU', 'Hongrie', 'Hungary', 'B', 4, 5, 5, 4, 6, 'petit'),
  c('RO', 'Roumanie', 'Romania', 'B', 5, 5, 5, 4, 6, 'moyen'),
  c('BG', 'Bulgarie', 'Bulgaria', 'B', 4, 4, 5, 3, 6, 'petit'),
  c('BA', 'Bosnie-Herzégovine', 'Bosnia and Herzegovina', 'B', 4, 4, 5, 3, 6, 'petit'),
  c('MK', 'Macédoine du Nord', 'North Macedonia', 'B', 3, 4, 4, 3, 7, 'petit'),
  c('AL', 'Albanie', 'Albania', 'B', 3, 4, 4, 3, 7, 'petit'),
  c('IL', 'Israël', 'Israel', 'B', 4, 6, 5, 4, 6, 'petit'),
  c('IR', 'Iran', 'Iran', 'B', 6, 5, 5, 5, 4, 'grand'),
  c('SA', 'Arabie Saoudite', 'Saudi Arabia', 'B', 5, 7, 5, 6, 5, 'grand'),
  c('QA', 'Qatar', 'Qatar', 'B', 3, 8, 5, 5, 7, 'micro'),
  c('AE', 'Émirats Arabes Unis', 'United Arab Emirates', 'B', 3, 7, 5, 5, 7, 'petit'),
  c('AU', 'Australie', 'Australia', 'B', 5, 6, 4, 4, 6, 'grand'),
  c('NZ', 'Nouvelle-Zélande', 'New Zealand', 'B', 2, 5, 3, 3, 8, 'petit'),
  c('CA', 'Canada', 'Canada', 'B', 4, 6, 4, 4, 6, 'grand'),
  c('CR', 'Costa Rica', 'Costa Rica', 'B', 3, 4, 4, 3, 7, 'petit'),
  c('JM', 'Jamaïque', 'Jamaica', 'B', 3, 4, 4, 3, 7, 'petit'),
  c('PA', 'Panama', 'Panama', 'B', 3, 4, 4, 3, 7, 'petit'),
  c('HN', 'Honduras', 'Honduras', 'B', 3, 3, 3, 3, 7, 'petit'),
  c('ZA', 'Afrique du Sud', 'South Africa', 'B', 5, 5, 4, 4, 6, 'grand'),
  c('CM', 'Cameroun', 'Cameroon', 'B', 5, 4, 5, 3, 6, 'moyen'),
  c('ML', 'Mali', 'Mali', 'B', 4, 3, 5, 2, 6, 'petit'),
  c('BF', 'Burkina Faso', 'Burkina Faso', 'B', 4, 3, 4, 2, 6, 'petit'),
  c('CD', 'RD Congo', 'DR Congo', 'B', 4, 3, 4, 2, 6, 'grand'),
  c('ZM', 'Zambie', 'Zambia', 'B', 3, 3, 3, 2, 7, 'petit'),
  c('UG', 'Ouganda', 'Uganda', 'B', 3, 3, 3, 2, 7, 'petit'),
  c('KE', 'Kenya', 'Kenya', 'B', 3, 3, 3, 2, 7, 'petit'),
  c('CN', 'Chine', 'China', 'B', 5, 7, 4, 5, 5, 'grand'),
  c('IN', 'Inde', 'India', 'B', 3, 4, 3, 3, 7, 'grand'),
  c('VN', 'Vietnam', 'Vietnam', 'B', 3, 4, 3, 3, 7, 'moyen'),
  c('TH', 'Thaïlande', 'Thailand', 'B', 3, 4, 3, 3, 7, 'moyen'),
  c('ID', 'Indonésie', 'Indonesia', 'B', 3, 3, 3, 3, 7, 'grand'),

  // ---- Tier C : petites nations ----
  c('EE', 'Estonie', 'Estonia', 'C', 2, 3, 2, 2, 8, 'petit'),
  c('LV', 'Lettonie', 'Latvia', 'C', 2, 3, 2, 2, 8, 'petit'),
  c('LT', 'Lituanie', 'Lithuania', 'C', 2, 3, 2, 2, 8, 'petit'),
  c('GE', 'Géorgie', 'Georgia', 'C', 2, 3, 3, 2, 8, 'petit'),
  c('AM', 'Arménie', 'Armenia', 'C', 2, 3, 3, 2, 8, 'petit'),
  c('AZ', 'Azerbaïdjan', 'Azerbaijan', 'C', 2, 4, 3, 3, 8, 'petit'),
  c('MD', 'Moldavie', 'Moldova', 'C', 2, 2, 2, 2, 8, 'petit'),
  c('BY', 'Biélorussie', 'Belarus', 'C', 3, 4, 3, 3, 7, 'petit'),
  c('CY', 'Chypre', 'Cyprus', 'C', 2, 4, 3, 3, 8, 'petit'),
  c('ME', 'Monténégro', 'Montenegro', 'C', 2, 3, 3, 2, 8, 'petit'),
  c('XK', 'Kosovo', 'Kosovo', 'C', 2, 3, 3, 2, 8, 'petit'),
  c('BO', 'Bolivie', 'Bolivia', 'C', 3, 3, 3, 3, 7, 'moyen'),
  c('VE', 'Venezuela', 'Venezuela', 'C', 3, 3, 3, 3, 7, 'moyen'),
  c('SV', 'Salvador', 'El Salvador', 'C', 2, 2, 2, 2, 8, 'petit'),
  c('GT', 'Guatemala', 'Guatemala', 'C', 2, 2, 2, 2, 8, 'petit'),
  c('TT', 'Trinité-et-Tobago', 'Trinidad and Tobago', 'C', 2, 3, 2, 2, 8, 'micro'),
  c('HT', 'Haïti', 'Haiti', 'C', 3, 2, 2, 2, 7, 'petit'),
  c('ZW', 'Zimbabwe', 'Zimbabwe', 'C', 3, 2, 2, 2, 7, 'petit'),
  c('BW', 'Botswana', 'Botswana', 'C', 2, 2, 2, 2, 8, 'micro'),
  c('NA', 'Namibie', 'Namibia', 'C', 2, 2, 2, 2, 8, 'micro'),
  c('RW', 'Rwanda', 'Rwanda', 'C', 2, 2, 2, 1, 8, 'petit'),
  c('BJ', 'Bénin', 'Benin', 'C', 2, 2, 2, 1, 8, 'petit'),
  c('TG', 'Togo', 'Togo', 'C', 2, 2, 2, 1, 8, 'micro'),
  c('GA', 'Gabon', 'Gabon', 'C', 2, 3, 2, 2, 8, 'micro'),
  c('CG', 'Congo', 'Congo', 'C', 2, 2, 2, 1, 8, 'micro'),
  c('MG', 'Madagascar', 'Madagascar', 'C', 2, 2, 2, 1, 8, 'petit'),
  c('MU', 'Maurice', 'Mauritius', 'C', 1, 3, 2, 1, 9, 'micro'),
  c('NP', 'Népal', 'Nepal', 'C', 2, 2, 1, 1, 8, 'petit'),
  c('BD', 'Bangladesh', 'Bangladesh', 'C', 3, 2, 1, 2, 7, 'grand'),
  c('KH', 'Cambodge', 'Cambodia', 'C', 2, 2, 1, 1, 8, 'petit'),
  c('MN', 'Mongolie', 'Mongolia', 'C', 1, 2, 1, 1, 9, 'micro'),
  c('CV', 'Cap-Vert', 'Cape Verde', 'C', 2, 3, 3, 2, 8, 'micro'),

  // ---- Tier D : micro-nations (plafond très bas, sélection quasi garantie) ----
  c('SM', 'Saint-Marin', 'San Marino', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('AD', 'Andorre', 'Andorra', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('LI', 'Liechtenstein', 'Liechtenstein', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('GI', 'Gibraltar', 'Gibraltar', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('FO', 'Îles Féroé', 'Faroe Islands', 'D', 1, 2, 1, 1, 10, 'micro'),
  c('MT', 'Malte', 'Malta', 'D', 1, 2, 2, 1, 9, 'micro'),
  c('LU', 'Luxembourg', 'Luxembourg', 'D', 1, 3, 2, 1, 9, 'micro'),
  c('BT', 'Bhoutan', 'Bhutan', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('BN', 'Brunei', 'Brunei', 'D', 1, 2, 1, 1, 10, 'micro'),
  c('KM', 'Comores', 'Comoros', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('SZ', 'Eswatini', 'Eswatini', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('LS', 'Lesotho', 'Lesotho', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('SC', 'Seychelles', 'Seychelles', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('ST', 'Sao Tomé-et-Principe', 'Sao Tome and Principe', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('TL', 'Timor Oriental', 'East Timor', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('AS', 'Samoa Américaines', 'American Samoa', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('CK', 'Îles Cook', 'Cook Islands', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('AI', 'Anguilla', 'Anguilla', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('DJ', 'Djibouti', 'Djibouti', 'D', 1, 1, 1, 1, 10, 'micro'),
  c('SO', 'Somalie', 'Somalia', 'D', 1, 1, 1, 1, 10, 'micro'),
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
