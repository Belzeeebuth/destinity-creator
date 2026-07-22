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

export const ATTRIBUTE_LABELS_EN: Record<AttributeKey, string> = {
  technique: 'Technique',
  passe: 'Passing',
  tir: 'Shooting',
  defense: 'Defending',
  vitesse: 'Pace',
  physique: 'Physical',
  vision: 'Vision',
  mental: 'Mental',
  reflexes: 'Reflexes',
};

export const ATTRIBUTE_ICONS: Record<AttributeKey, string> = {
  technique: '⚽',
  passe: '🤝',
  tir: '🎯',
  defense: '🛡️',
  vitesse: '⚡',
  physique: '💪',
  vision: '👁️',
  mental: '🧠',
  reflexes: '🧤',
};

export const ATTRIBUTE_DESCRIPTIONS: Record<AttributeKey, string> = {
  technique: 'Contrôle de balle, dribble et première touche.',
  passe: 'Précision et vision des passes courtes et longues.',
  tir: 'Puissance et précision de frappe face au but.',
  defense: 'Tacles, interceptions et marquage des adversaires.',
  vitesse: 'Vitesse de pointe et capacité d’accélération.',
  physique: 'Force, endurance et duels physiques.',
  vision: 'Lecture du jeu et prise de décision.',
  mental: 'Sang-froid, discipline tactique et constance.',
  reflexes: "Réactivité du gardien face aux tirs adverses.",
};

export const ATTRIBUTE_DESCRIPTIONS_EN: Record<AttributeKey, string> = {
  technique: 'Ball control, dribbling and first touch.',
  passe: 'Accuracy and vision on short and long passes.',
  tir: 'Power and precision when shooting on goal.',
  defense: 'Tackling, interceptions and marking opponents.',
  vitesse: 'Top speed and acceleration.',
  physique: 'Strength, stamina and physical duels.',
  vision: 'Game reading and decision-making.',
  mental: 'Composure, tactical discipline and consistency.',
  reflexes: "Goalkeeper reactivity against opposing shots.",
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
  nameEn: string;
  short: string;
  emoji: string;
  description: string;
  descriptionEn: string;
  // Poids de chaque attribut dans la note globale (somme ~= 10)
  weights: Record<AttributeKey, number>;
  // Attributs prioritaires à l'entraînement (mis en avant dans l'UI)
  keyAttributes: AttributeKey[];
}

export const POSITIONS: Position[] = [
  {
    code: 'GK',
    name: 'Gardien de but',
    nameEn: 'Goalkeeper',
    short: 'G',
    emoji: '🧤',
    description: "Le dernier rempart. Réflexes et sang-froid font la différence entre le héros et le fusible.",
    descriptionEn: 'The last line of defense. Reflexes and composure separate the hero from the fall guy.',
    weights: { technique: 0.5, passe: 1, tir: 0, defense: 1, vitesse: 0.5, physique: 1.5, vision: 1, mental: 2, reflexes: 3.5 },
    keyAttributes: ['reflexes', 'mental', 'physique'],
  },
  {
    code: 'CB',
    name: 'Défenseur central',
    nameEn: 'Centre-back',
    short: 'DC',
    emoji: '🛡️',
    description: "Le roc de la défense. Placement, duels aériens et lecture du jeu avant tout.",
    descriptionEn: 'The rock of the defense. Positioning, aerial duels and game reading above all.',
    weights: { technique: 0.5, passe: 1, tir: 0.2, defense: 3.5, vitesse: 1, physique: 2.3, vision: 1, mental: 0.5, reflexes: 0 },
    keyAttributes: ['defense', 'physique', 'vitesse'],
  },
  {
    code: 'FB',
    name: 'Latéral',
    nameEn: 'Full-back',
    short: 'LAT',
    emoji: '🏃',
    description: "Couloir infini entre défense et attaque. Endurance et centres précis.",
    descriptionEn: 'An endless shuttle between defense and attack. Stamina and precise crosses.',
    weights: { technique: 1, passe: 1.5, tir: 0.3, defense: 2.2, vitesse: 2, physique: 1.5, vision: 1, mental: 0.5, reflexes: 0 },
    keyAttributes: ['vitesse', 'defense', 'passe'],
  },
  {
    code: 'DM',
    name: 'Milieu défensif',
    nameEn: 'Defensive midfielder',
    short: 'MDF',
    emoji: '🧱',
    description: "Le métronome sans ballon. Récupère, protège la charnière, relance proprement.",
    descriptionEn: 'The metronome without the ball. Wins it back, shields the back line, and distributes cleanly.',
    weights: { technique: 1.5, passe: 2, tir: 0.3, defense: 2.5, vitesse: 0.8, physique: 1.7, vision: 1.5, mental: 0.2, reflexes: 0 },
    keyAttributes: ['defense', 'passe', 'physique'],
  },
  {
    code: 'CM',
    name: 'Milieu central',
    nameEn: 'Central midfielder',
    short: 'MC',
    emoji: '🎛️',
    description: "Box-to-box. Un pied dans chaque surface, la boîte à outils complète.",
    descriptionEn: 'Box-to-box. One foot in each penalty area, the complete toolkit.',
    weights: { technique: 1.8, passe: 2.2, tir: 0.8, defense: 1.3, vitesse: 1.2, physique: 1.5, vision: 1.2, mental: 0, reflexes: 0 },
    keyAttributes: ['passe', 'technique', 'physique'],
  },
  {
    code: 'AM',
    name: 'Milieu offensif',
    nameEn: 'Attacking midfielder',
    short: 'MOC',
    emoji: '🎨',
    description: "Le créateur. Entre les lignes, il fait exister le beau jeu.",
    descriptionEn: 'The creator. Between the lines, he brings the beautiful game to life.',
    weights: { technique: 2.3, passe: 2, tir: 1.2, defense: 0.3, vitesse: 1.2, physique: 0.5, vision: 2.5, mental: 0, reflexes: 0 },
    keyAttributes: ['vision', 'technique', 'passe'],
  },
  {
    code: 'WI',
    name: 'Ailier',
    nameEn: 'Winger',
    short: 'AIL',
    emoji: '💨',
    description: "Vitesse et dribble sur le couloir. Le fournisseur d'étincelles.",
    descriptionEn: 'Speed and dribbling out wide. The supplier of magic moments.',
    weights: { technique: 2, passe: 1, tir: 1.5, defense: 0.3, vitesse: 2.7, physique: 0.5, vision: 1, mental: 1, reflexes: 0 },
    keyAttributes: ['vitesse', 'technique', 'tir'],
  },
  {
    code: 'ST',
    name: 'Attaquant',
    nameEn: 'Striker',
    short: 'ATT',
    emoji: '🎯',
    description: "Le finisseur. On le juge à un seul chiffre : celui des buts.",
    descriptionEn: 'The finisher. Judged on a single number: goals.',
    weights: { technique: 1.8, passe: 0.5, tir: 3, defense: 0, vitesse: 1.7, physique: 1.5, vision: 1, mental: 0.5, reflexes: 0 },
    keyAttributes: ['tir', 'vitesse', 'technique'],
  },
];

export function getPosition(code: PositionCode): Position {
  const found = POSITIONS.find((p) => p.code === code);
  if (!found) throw new Error(`Poste inconnu: ${code}`);
  return found;
}
