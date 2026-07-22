import type { AttributeKey } from './positions';

export interface Background {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  description: string;
  descriptionEn: string;
  attributeStart: Partial<Record<AttributeKey, number>>;
  disciplineStart: number; // 0-100
  moraleStart: number; // 0-100
  resilience: number; // -2..+2, influence la réaction aux échecs/blessures
  traits: string[]; // tags narratifs utilisés par le moteur d'évènements
}

export const BACKGROUNDS: Background[] = [
  {
    id: 'aise',
    name: 'Milieu aisé',
    nameEn: 'Affluent background',
    emoji: '🏙️',
    description:
      "Tes parents ont pu payer les meilleurs clubs formateurs privés, un préparateur physique et une alimentation suivie. Tu pars avec des bases solides, mais la faim de revanche n'est pas toujours au rendez-vous.",
    descriptionEn:
      'Your parents could afford the best private academies, a personal fitness coach and a proper diet. You start with solid foundations, but the hunger for revenge isn\'t always there.',
    attributeStart: { technique: 3, vision: 2, physique: -1 },
    disciplineStart: 62,
    moraleStart: 65,
    resilience: -1,
    traits: ['confortable', 'reseau_social'],
  },
  {
    id: 'classe_moyenne',
    name: 'Classe moyenne',
    nameEn: 'Middle class',
    emoji: '🏘️',
    description:
      "Ni privilégié, ni dans le besoin. Un club de quartier sérieux, des parents présents le week-end. Un profil équilibré, sans excès dans un sens ou dans l'autre.",
    descriptionEn:
      'Neither privileged nor in need. A serious local club, parents present on weekends. A balanced profile, without excess in either direction.',
    attributeStart: {},
    disciplineStart: 60,
    moraleStart: 60,
    resilience: 0,
    traits: ['equilibre'],
  },
  {
    id: 'populaire',
    name: 'Milieu populaire',
    nameEn: 'Working-class background',
    emoji: '🏚️',
    description:
      "Tu as grandi dans un quartier où le foot occupe tous les terrains vagues. Moins d'encadrement technique, mais une hargne et une repartie forgées à la dure.",
    descriptionEn:
      'You grew up in a neighborhood where football takes over every vacant lot. Less technical coaching, but a hunger and a sharp tongue forged the hard way.',
    attributeStart: { physique: 2, mental: 2, technique: -1 },
    disciplineStart: 55,
    moraleStart: 58,
    resilience: 1,
    traits: ['hargneux', 'debrouillard'],
  },
  {
    id: 'precaire',
    name: 'Milieu précaire',
    nameEn: 'Precarious background',
    emoji: '🪫',
    description:
      "L'argent a toujours manqué à la maison. Chaque paire de crampons est un sacrifice familial. Ce vécu forge un mental de fer, mais fragilise le début de carrière : le foot doit vite rapporter.",
    descriptionEn:
      "Money was always tight at home. Every pair of boots is a family sacrifice. This upbringing forges an iron will, but puts pressure on the start of your career: football needs to pay off fast.",
    attributeStart: { mental: 3, physique: 1, technique: -2 },
    disciplineStart: 50,
    moraleStart: 52,
    resilience: 2,
    traits: ['affame', 'pression_financiere'],
  },
  {
    id: 'rural',
    name: 'Milieu rural / isolé',
    nameEn: 'Rural / isolated background',
    emoji: '🌾',
    description:
      "Loin des grands centres de formation, tu as appris le foot seul, sur la terre battue plus que sur pelouse. Un talent brut, rarement repéré à temps.",
    descriptionEn:
      "Far from the big academies, you learned football on your own, more on dirt than on grass. A raw talent, rarely spotted in time.",
    attributeStart: { physique: 2, technique: 1, vision: -2 },
    disciplineStart: 58,
    moraleStart: 55,
    resilience: 1,
    traits: ['isole', 'talent_brut'],
  },
  {
    id: 'dynastie',
    name: 'Famille de footballeurs',
    nameEn: 'Footballing family',
    emoji: '👨‍👦',
    description:
      "Un parent ou un frère a déjà porté le maillot pro. Tu grandis dans les vestiaires, avec des conseils avisés dès le berceau — mais aussi une comparaison permanente à assumer.",
    descriptionEn:
      "A parent or a brother has already worn the pro jersey. You grow up in locker rooms, with sound advice from the cradle — but also a constant comparison to live up to.",
    attributeStart: { vision: 2, mental: -1, technique: 1 },
    disciplineStart: 63,
    moraleStart: 58,
    resilience: -1,
    traits: ['heritage', 'attentes_elevees'],
  },
];

export function getBackground(id: string): Background {
  const found = BACKGROUNDS.find((b) => b.id === id);
  if (!found) throw new Error(`Origine inconnue: ${id}`);
  return found;
}
