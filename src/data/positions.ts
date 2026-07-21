export type AttributeKey =
  | 'technique'
  | 'passe'
  | 'tir'
  | 'defense'
  | 'vitesse'
  | 'physique'
  | 'vision'
  | 'mental'
  | 'reflexes';

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  technique: 'Technique',
  passe: 'Passe',
  tir: 'Tir',
  defense: 'Défense',
  vitesse: 'Vitesse',
  physique: 'Physique',
  vision: 'Vision de jeu',
  mental: 'Mental',
  reflexes: 'Réflexes',
};

export const ATTRIBUTE_KEYS: AttributeKey[] = [
  'technique',
  'passe',
  'tir',
  'defense',
  'vitesse',
  'physique',
  'vision',
  'mental',
  'reflexes',
];

export type PositionCode = 'GK' | 'CB' | 'FB' | 'DM' | 'CM' | 'AM' | 'WI' | 'ST';

export interface Position {
  code: PositionCode;
  name: string;
  short: string;
  description: string;
  // Poids de chaque attribut dans la note globale (somme ~= 10)
  weights: Record<AttributeKey, number>;
  // Attributs prioritaires à l'entraînement (mis en avant dans l'UI)
  keyAttributes: AttributeKey[];
}

export const POSITIONS: Position[] = [
  {
    code: 'GK',
    name: 'Gardien de but',
    short: 'G',
    description: "Le dernier rempart. Réflexes et sang-froid font la différence entre le héros et le fusible.",
    weights: { technique: 0.5, passe: 1, tir: 0, defense: 1, vitesse: 0.5, physique: 1.5, vision: 1, mental: 2, reflexes: 3.5 },
    keyAttributes: ['reflexes', 'mental', 'physique'],
  },
  {
    code: 'CB',
    name: 'Défenseur central',
    short: 'DC',
    description: "Le roc de la défense. Placement, duels aériens et lecture du jeu avant tout.",
    weights: { technique: 0.5, passe: 1, tir: 0.2, defense: 3.5, vitesse: 1, physique: 2.3, vision: 1, mental: 0.5, reflexes: 0 },
    keyAttributes: ['defense', 'physique', 'vitesse'],
  },
  {
    code: 'FB',
    name: 'Latéral',
    short: 'LAT',
    description: "Couloir infini entre défense et attaque. Endurance et centres précis.",
    weights: { technique: 1, passe: 1.5, tir: 0.3, defense: 2.2, vitesse: 2, physique: 1.5, vision: 1, mental: 0.5, reflexes: 0 },
    keyAttributes: ['vitesse', 'defense', 'passe'],
  },
  {
    code: 'DM',
    name: 'Milieu défensif',
    short: 'MDF',
    description: "Le métronome sans ballon. Récupère, protège la charnière, relance proprement.",
    weights: { technique: 1.5, passe: 2, tir: 0.3, defense: 2.5, vitesse: 0.8, physique: 1.7, vision: 1.5, mental: 0.2, reflexes: 0 },
    keyAttributes: ['defense', 'passe', 'physique'],
  },
  {
    code: 'CM',
    name: 'Milieu central',
    short: 'MC',
    description: "Box-to-box. Un pied dans chaque surface, la boîte à outils complète.",
    weights: { technique: 1.8, passe: 2.2, tir: 0.8, defense: 1.3, vitesse: 1.2, physique: 1.5, vision: 1.2, mental: 0, reflexes: 0 },
    keyAttributes: ['passe', 'technique', 'physique'],
  },
  {
    code: 'AM',
    name: 'Milieu offensif',
    short: 'MOC',
    description: "Le créateur. Entre les lignes, il fait exister le beau jeu.",
    weights: { technique: 2.3, passe: 2, tir: 1.2, defense: 0.3, vitesse: 1.2, physique: 0.5, vision: 2.5, mental: 0, reflexes: 0 },
    keyAttributes: ['vision', 'technique', 'passe'],
  },
  {
    code: 'WI',
    name: 'Ailier',
    short: 'AIL',
    description: "Vitesse et dribble sur le couloir. Le fournisseur d'étincelles.",
    weights: { technique: 2, passe: 1, tir: 1.5, defense: 0.3, vitesse: 2.7, physique: 0.5, vision: 1, mental: 1, reflexes: 0 },
    keyAttributes: ['vitesse', 'technique', 'tir'],
  },
  {
    code: 'ST',
    name: 'Attaquant',
    short: 'ATT',
    description: "Le finisseur. On le juge à un seul chiffre : celui des buts.",
    weights: { technique: 1.8, passe: 0.5, tir: 3, defense: 0, vitesse: 1.7, physique: 1.5, vision: 1, mental: 0.5, reflexes: 0 },
    keyAttributes: ['tir', 'vitesse', 'technique'],
  },
];

export function getPosition(code: PositionCode): Position {
  const found = POSITIONS.find((p) => p.code === code);
  if (!found) throw new Error(`Poste inconnu: ${code}`);
  return found;
}
