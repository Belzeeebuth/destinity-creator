import type { PlayerState } from '../engine/types';

export interface Badge {
  id: string;
  name: string;
  description: string;
  check: (state: PlayerState) => boolean;
}

export const BADGES: Badge[] = [
  {
    id: 'premier_contrat',
    name: 'Premier contrat',
    description: 'Signer ton tout premier contrat professionnel.',
    check: (s) => s.history.some((h) => h.clubTierIndex >= 3),
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Cumuler 100 buts en carrière.',
    check: (s) => s.careerGoals >= 100,
  },
  {
    id: 'legende_locale',
    name: 'Légende locale',
    description: 'Cumuler 250 buts en carrière.',
    check: (s) => s.careerGoals >= 250,
  },
  {
    id: 'capitaine',
    name: 'Le Capitaine',
    description: 'Porter le brassard, en club ou en sélection.',
    check: (s) => s.captain,
  },
  {
    id: 'international',
    name: 'International',
    description: 'Honorer ta première sélection nationale.',
    check: (s) => s.caps > 0,
  },
  {
    id: 'monument_national',
    name: 'Monument national',
    description: 'Cumuler 100 sélections nationales.',
    check: (s) => s.caps >= 100,
  },
  {
    id: 'sommet_mondial',
    name: 'Sommet mondial',
    description: 'Évoluer dans un club d’élite mondiale (tier 5).',
    check: (s) => s.history.some((h) => h.clubTierIndex >= 5),
  },
  {
    id: 'petit_pays_grand_destin',
    name: 'Petit pays, grand destin',
    description: 'Percer au plus haut niveau mondial en partant d’une micro-nation.',
    check: () => false, // évalué par le moteur avec le contexte pays, voir evaluateBadges
  },
  {
    id: 'increvable',
    name: 'Increvable',
    description: 'Terminer une carrière complète sans aucune blessure grave.',
    check: (s) => s.retired && s.careerInjuries === 0,
  },
  {
    id: 'increvable_pas',
    name: 'Corps en cristal',
    description: 'Subir 8 blessures ou plus au cours d’une carrière.',
    check: (s) => s.careerInjuries >= 8,
  },
  {
    id: 'longevite',
    name: 'Longévité exemplaire',
    description: 'Jouer jusqu’à 40 ans ou plus.',
    check: (s) => s.age >= 40,
  },
  {
    id: 'jusquau_bout',
    name: "Jusqu'au bout",
    description: 'Aller au bout de la limite d’âge, jusqu’à 45 ans.',
    check: (s) => s.age >= 45,
  },
  {
    id: 'multi_titres',
    name: 'Collectionneur de trophées',
    description: 'Remporter 5 trophées collectifs ou plus.',
    check: (s) => s.trophies.length >= 5,
  },
  {
    id: 'exemplaire',
    name: 'Exemplaire',
    description: 'Terminer ta carrière avec une discipline irréprochable (90+).',
    check: (s) => s.retired && s.discipline >= 90,
  },
  {
    id: 'double_projet',
    name: 'Double projet',
    description: 'Entamer une reconversion d’entraîneur durant ta carrière de joueur.',
    check: (s) => s.awards.includes('Formation entraîneur entamée'),
  },
];

export function evaluateBadges(state: PlayerState, alreadyUnlocked: string[], countryTier: string): string[] {
  const newly: string[] = [];
  for (const badge of BADGES) {
    if (alreadyUnlocked.includes(badge.id)) continue;
    if (badge.id === 'petit_pays_grand_destin') {
      if ((countryTier === 'C' || countryTier === 'D') && state.history.some((h) => h.clubTierIndex >= 4)) newly.push(badge.id);
      continue;
    }
    if (badge.check(state)) newly.push(badge.id);
  }
  return newly;
}
