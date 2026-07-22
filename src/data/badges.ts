import type { PlayerState } from '../engine/types';

export interface Badge {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  check: (state: PlayerState) => boolean;
}

export const BADGES: Badge[] = [
  {
    id: 'premier_contrat',
    name: 'Premier contrat',
    nameEn: 'First contract',
    description: 'Signer ton tout premier contrat professionnel.',
    descriptionEn: 'Sign your very first professional contract.',
    check: (s) => s.history.some((h) => h.clubTierIndex >= 3),
  },
  {
    id: 'centurion',
    name: 'Centurion',
    nameEn: 'Centurion',
    description: 'Cumuler 100 buts en carrière.',
    descriptionEn: 'Score 100 career goals.',
    check: (s) => s.careerGoals >= 100,
  },
  {
    id: 'legende_locale',
    name: 'Légende locale',
    nameEn: 'Local legend',
    description: 'Cumuler 250 buts en carrière.',
    descriptionEn: 'Score 250 career goals.',
    check: (s) => s.careerGoals >= 250,
  },
  {
    id: 'capitaine',
    name: 'Le Capitaine',
    nameEn: 'The Captain',
    description: 'Porter le brassard, en club ou en sélection.',
    descriptionEn: 'Wear the armband, for your club or your national team.',
    check: (s) => s.captain,
  },
  {
    id: 'international',
    name: 'International',
    nameEn: 'International',
    description: 'Honorer ta première sélection nationale.',
    descriptionEn: 'Earn your first national team cap.',
    check: (s) => s.caps > 0,
  },
  {
    id: 'monument_national',
    name: 'Monument national',
    nameEn: 'National monument',
    description: 'Cumuler 100 sélections nationales.',
    descriptionEn: 'Earn 100 national team caps.',
    check: (s) => s.caps >= 100,
  },
  {
    id: 'sommet_mondial',
    name: 'Sommet mondial',
    nameEn: 'World summit',
    description: 'Évoluer dans un club d’élite mondiale (tier 5).',
    descriptionEn: 'Play for a world-elite club (tier 5).',
    check: (s) => s.history.some((h) => h.clubTierIndex >= 5),
  },
  {
    id: 'petit_pays_grand_destin',
    name: 'Petit pays, grand destin',
    nameEn: 'Small country, big destiny',
    description: 'Percer au plus haut niveau mondial en partant d’une micro-nation.',
    descriptionEn: 'Break through at the highest world level starting from a micro-nation.',
    check: () => false, // évalué par le moteur avec le contexte pays, voir evaluateBadges
  },
  {
    id: 'increvable',
    name: 'Increvable',
    nameEn: 'Indestructible',
    description: 'Terminer une carrière complète sans aucune blessure grave.',
    descriptionEn: 'Finish a full career without a single serious injury.',
    check: (s) => s.retired && s.careerInjuries === 0,
  },
  {
    id: 'increvable_pas',
    name: 'Corps en cristal',
    nameEn: 'Glass body',
    description: 'Subir 8 blessures ou plus au cours d’une carrière.',
    descriptionEn: 'Suffer 8 or more injuries over a career.',
    check: (s) => s.careerInjuries >= 8,
  },
  {
    id: 'longevite',
    name: 'Longévité exemplaire',
    nameEn: 'Exemplary longevity',
    description: 'Jouer jusqu’à 40 ans ou plus.',
    descriptionEn: 'Play until age 40 or beyond.',
    check: (s) => s.age >= 40,
  },
  {
    id: 'jusquau_bout',
    name: "Jusqu'au bout",
    nameEn: 'To the very end',
    description: 'Aller au bout de la limite d’âge, jusqu’à 45 ans.',
    descriptionEn: 'Go all the way to the age limit, up to 45.',
    check: (s) => s.age >= 45,
  },
  {
    id: 'multi_titres',
    name: 'Collectionneur de trophées',
    nameEn: 'Trophy collector',
    description: 'Remporter 5 trophées collectifs ou plus.',
    descriptionEn: 'Win 5 or more team trophies.',
    check: (s) => s.trophies.length >= 5,
  },
  {
    id: 'exemplaire',
    name: 'Exemplaire',
    nameEn: 'Exemplary',
    description: 'Terminer ta carrière avec une discipline irréprochable (90+).',
    descriptionEn: 'Finish your career with impeccable discipline (90+).',
    check: (s) => s.retired && s.discipline >= 90,
  },
  {
    id: 'double_projet',
    name: 'Double projet',
    nameEn: 'Double project',
    description: 'Entamer une reconversion d’entraîneur durant ta carrière de joueur.',
    descriptionEn: 'Start a coaching career transition during your playing career.',
    check: (s) => s.coachingPathStarted,
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
