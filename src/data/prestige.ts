export type PrestigeEffect = 'permanent_reputation' | 'reputation_shield';

export interface PrestigeAsset {
  id: string;
  name: string;
  emoji: string;
  description: string;
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
    emoji: '🏢',
    description: "Un pied-à-terre chic en centre-ville qui en dit long sur ta réussite naissante.",
    cost: 20000,
    effect: 'permanent_reputation',
    value: 3,
  },
  {
    id: 'voiture_collection',
    name: 'Voiture de collection',
    emoji: '🏎️',
    description: 'Un bolide qui ne passe jamais inaperçu aux abords du centre d’entraînement.',
    cost: 45000,
    effect: 'reputation_shield',
    value: 0.12,
  },
  {
    id: 'villa_luxe',
    name: 'Villa de luxe',
    emoji: '🏡',
    description: 'Piscine, home cinéma, sécurité privée : le symbole ultime de la réussite.',
    cost: 90000,
    effect: 'permanent_reputation',
    value: 6,
  },
  {
    id: 'oeuvre_signature',
    name: 'Œuvre d’art iconique',
    emoji: '🖼️',
    description: 'Une pièce rare exposée chez toi, qui fait parler dans les magazines people.',
    cost: 130000,
    effect: 'permanent_reputation',
    value: 8,
  },
  {
    id: 'yacht_prive',
    name: 'Yacht privé',
    emoji: '🛥️',
    description: "Un havre de paix loin des projecteurs — et un bouclier bienvenu quand la presse s'acharne.",
    cost: 220000,
    effect: 'reputation_shield',
    value: 0.22,
  },
  {
    id: 'jet_prive',
    name: 'Jet privé',
    emoji: '✈️',
    description: "Le sommet du prestige. Voyager incognito, loin des scandales et des paparazzis.",
    cost: 500000,
    effect: 'reputation_shield',
    value: 0.35,
  },
];

export function getPrestigeAsset(id: string): PrestigeAsset | undefined {
  return PRESTIGE_ASSETS.find((a) => a.id === id);
}
