export type PrestigeEffect = 'permanent_reputation' | 'reputation_shield';

export interface PrestigeAsset {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  description: string;
  descriptionEn: string;
  cost: number;
  effect: PrestigeEffect;
  value: number; // points de réputation immédiats, ou fraction (0-1) d'atténuation des pertes
}

// Achats uniques, financés par l'épargne (patrimoine), qui affichent ton standing dans le foot :
// soit un gain de réputation immédiat et permanent, soit un bouclier qui amortit tes futures pertes
// de réputation (scandales, polémiques...). Non revendables, à la différence des investissements.
export const PRESTIGE_ASSETS: PrestigeAsset[] = [
  {
    id: 'appartement_standing',
    name: 'Appartement de standing',
    nameEn: 'Upscale apartment',
    emoji: '🏢',
    description: "Un pied-à-terre chic en centre-ville qui en dit long sur ta réussite naissante.",
    descriptionEn: 'A chic city-center pied-à-terre that says a lot about your rising success.',
    cost: 20000,
    effect: 'permanent_reputation',
    value: 3,
  },
  {
    id: 'voiture_collection',
    name: 'Voiture de collection',
    nameEn: 'Collector car',
    emoji: '🏎️',
    description: 'Un bolide qui ne passe jamais inaperçu aux abords du centre d’entraînement.',
    descriptionEn: 'A supercar that never goes unnoticed outside the training ground.',
    cost: 45000,
    effect: 'reputation_shield',
    value: 0.12,
  },
  {
    id: 'villa_luxe',
    name: 'Villa de luxe',
    nameEn: 'Luxury villa',
    emoji: '🏡',
    description: 'Piscine, home cinéma, sécurité privée : le symbole ultime de la réussite.',
    descriptionEn: 'Pool, home cinema, private security: the ultimate symbol of success.',
    cost: 90000,
    effect: 'permanent_reputation',
    value: 6,
  },
  {
    id: 'oeuvre_signature',
    name: 'Œuvre d’art iconique',
    nameEn: 'Iconic artwork',
    emoji: '🖼️',
    description: 'Une pièce rare exposée chez toi, qui fait parler dans les magazines people.',
    descriptionEn: 'A rare piece displayed at home, the talk of the tabloids.',
    cost: 130000,
    effect: 'permanent_reputation',
    value: 8,
  },
  {
    id: 'yacht_prive',
    name: 'Yacht privé',
    nameEn: 'Private yacht',
    emoji: '🛥️',
    description: "Un havre de paix loin des projecteurs — et un bouclier bienvenu quand la presse s'acharne.",
    descriptionEn: 'A haven far from the spotlight — and a welcome shield when the press turns hostile.',
    cost: 220000,
    effect: 'reputation_shield',
    value: 0.22,
  },
  {
    id: 'jet_prive',
    name: 'Jet privé',
    nameEn: 'Private jet',
    emoji: '✈️',
    description: "Le sommet du prestige. Voyager incognito, loin des scandales et des paparazzis.",
    descriptionEn: 'The peak of prestige. Travel incognito, far from scandals and paparazzi.',
    cost: 500000,
    effect: 'reputation_shield',
    value: 0.35,
  },
];

export function getPrestigeAsset(id: string): PrestigeAsset | undefined {
  return PRESTIGE_ASSETS.find((a) => a.id === id);
}
