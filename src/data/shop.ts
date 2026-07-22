// Boutique : les jetons gagnés en fin de carrière permettent d'améliorer des avantages
// permanents par paliers (niveau 1 à 3), équipables (2 maximum) sur une future carrière,
// et d'acheter des objets consommables à usage unique, utilisables en cours de partie.
export type AdvantageEffect =
  | 'growth'
  | 'injury_shield'
  | 'reputation_start'
  | 'discipline_shield'
  | 'wage_boost'
  | 'scouting'
  | 'morale_start'
  | 'potential'
  | 'fitness'
  | 'youth_headstart';

export interface Advantage {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  effect: AdvantageEffect;
  baseValue: number; // effet au niveau 1
  valuePerLevel: number; // effet additionnel par niveau au-delà de 1
  baseCost: number; // jetons pour débloquer le niveau 1
  costPerLevel: number; // jetons additionnels par palier suivant
  maxLevel: number;
}

export const MAX_ADVANTAGE_LEVEL = 3;

export const ADVANTAGES: Advantage[] = [
  {
    id: 'prepa_physique',
    name: 'Préparateur physique personnel',
    nameEn: 'Personal fitness coach',
    description: 'Ralentit le déclin physique et accélère la progression liée à l’entraînement.',
    descriptionEn: 'Slows physical decline and speeds up training-related progression.',
    effect: 'growth',
    baseValue: 0.08,
    valuePerLevel: 0.06,
    baseCost: 100,
    costPerLevel: 70,
    maxLevel: MAX_ADVANTAGE_LEVEL,
  },
  {
    id: 'staff_medical',
    name: 'Staff médical de pointe',
    nameEn: 'Cutting-edge medical staff',
    description: 'Réduit le risque de blessure sur toute la carrière.',
    descriptionEn: 'Reduces injury risk over your entire career.',
    effect: 'injury_shield',
    baseValue: 0.2,
    valuePerLevel: 0.12,
    baseCost: 110,
    costPerLevel: 80,
    maxLevel: MAX_ADVANTAGE_LEVEL,
  },
  {
    id: 'carnet_adresses',
    name: 'Carnet d’adresses doré',
    nameEn: 'Golden contact book',
    description: 'Tu démarres avec une réputation initiale plus élevée, plus vite repéré des recruteurs.',
    descriptionEn: 'You start with a higher initial reputation, spotted faster by scouts.',
    effect: 'reputation_start',
    baseValue: 8,
    valuePerLevel: 6,
    baseCost: 70,
    costPerLevel: 50,
    maxLevel: MAX_ADVANTAGE_LEVEL,
  },
  {
    id: 'mental_acier',
    name: 'Mental d’acier',
    nameEn: 'Iron will',
    description: 'Réduit les risques d’incidents disciplinaires et de blessures face aux tentations.',
    descriptionEn: 'Reduces the risk of disciplinary incidents and injuries when facing temptation.',
    effect: 'discipline_shield',
    baseValue: 0.22,
    valuePerLevel: 0.14,
    baseCost: 80,
    costPerLevel: 60,
    maxLevel: MAX_ADVANTAGE_LEVEL,
  },
  {
    id: 'negociateur',
    name: 'Négociateur hors pair',
    nameEn: 'Outstanding negotiator',
    description: 'Tes contrats et primes de signature sont systématiquement meilleurs.',
    descriptionEn: 'Your contracts and signing bonuses are consistently better.',
    effect: 'wage_boost',
    baseValue: 0.12,
    valuePerLevel: 0.09,
    baseCost: 90,
    costPerLevel: 65,
    maxLevel: MAX_ADVANTAGE_LEVEL,
  },
  {
    id: 'reseau_scouts',
    name: 'Réseau de recruteurs internationaux',
    nameEn: 'International scouting network',
    description: 'Tu reçois davantage d’offres, et de meilleure qualité, à chaque fenêtre de transfert.',
    descriptionEn: 'You receive more offers, and better ones, at every transfer window.',
    effect: 'scouting',
    baseValue: 0.15,
    valuePerLevel: 0.1,
    baseCost: 100,
    costPerLevel: 75,
    maxLevel: MAX_ADVANTAGE_LEVEL,
  },
  {
    id: 'famille_soudee',
    name: 'Famille soudée',
    nameEn: 'Close-knit family',
    description: 'Un socle familial stable : ton moral de départ est nettement plus élevé.',
    descriptionEn: 'A stable family foundation: your starting morale is noticeably higher.',
    effect: 'morale_start',
    baseValue: 8,
    valuePerLevel: 6,
    baseCost: 55,
    costPerLevel: 40,
    maxLevel: MAX_ADVANTAGE_LEVEL,
  },
  {
    id: 'genes_talent',
    name: 'Étincelle de talent',
    nameEn: 'Spark of talent',
    description: 'Ton potentiel de progression est relevé sur tous les attributs.',
    descriptionEn: 'Your growth potential is raised across all attributes.',
    effect: 'potential',
    baseValue: 3,
    valuePerLevel: 2,
    baseCost: 130,
    costPerLevel: 90,
    maxLevel: MAX_ADVANTAGE_LEVEL,
  },
  {
    id: 'hygiene_de_vie',
    name: 'Hygiène de vie exemplaire',
    nameEn: 'Exemplary lifestyle',
    description: 'Ta forme physique de départ et sa récupération saisonnière sont meilleures.',
    descriptionEn: 'Your starting fitness and its seasonal recovery are better.',
    effect: 'fitness',
    baseValue: 6,
    valuePerLevel: 4,
    baseCost: 65,
    costPerLevel: 45,
    maxLevel: MAX_ADVANTAGE_LEVEL,
  },
  {
    id: 'formation_elite',
    name: 'Formation d’élite dès l’enfance',
    nameEn: 'Elite training since childhood',
    description: 'Tes attributs de départ bénéficient d’un coup de pouce clé en main.',
    descriptionEn: 'Your starting attributes get a ready-made boost.',
    effect: 'youth_headstart',
    baseValue: 2,
    valuePerLevel: 2,
    baseCost: 120,
    costPerLevel: 85,
    maxLevel: MAX_ADVANTAGE_LEVEL,
  },
];

export function getAdvantage(id: string): Advantage | undefined {
  return ADVANTAGES.find((a) => a.id === id);
}

export function advantageValueAtLevel(advantage: Advantage, level: number): number {
  if (level <= 0) return 0;
  return advantage.baseValue + advantage.valuePerLevel * (level - 1);
}

export function advantageUpgradeCost(advantage: Advantage, currentLevel: number): number {
  return advantage.baseCost + advantage.costPerLevel * currentLevel;
}

// Résout, une fois pour toutes au lancement d'une carrière, la valeur totale de chaque
// effet en fonction des avantages équipés et de leur niveau débloqué.
export function resolveEquippedEffects(
  equippedIds: string[],
  levels: Record<string, number>,
): Partial<Record<AdvantageEffect, number>> {
  const result: Partial<Record<AdvantageEffect, number>> = {};
  for (const id of equippedIds) {
    const advantage = getAdvantage(id);
    const level = levels[id] ?? 0;
    if (!advantage || level <= 0) continue;
    const value = advantageValueAtLevel(advantage, level);
    result[advantage.effect] = (result[advantage.effect] ?? 0) + value;
  }
  return result;
}

export const MAX_EQUIPPED_ADVANTAGES = 2;

// ---------------- Objets consommables ----------------

export type ConsumableEffect = 'instant_fitness' | 'instant_morale' | 'season_growth_boost';

export interface Consumable {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  cost: number;
  effect: ConsumableEffect;
  value: number;
}

export const CONSUMABLES: Consumable[] = [
  {
    id: 'soin_eclair',
    name: 'Soin éclair',
    nameEn: 'Flash healing',
    description: 'Restaure instantanément une grande partie de ta forme physique.',
    descriptionEn: 'Instantly restores a large part of your fitness.',
    cost: 35,
    effect: 'instant_fitness',
    value: 55,
  },
  {
    id: 'regain_moral',
    name: 'Regain de moral',
    nameEn: 'Morale boost',
    description: 'Un déclic psychologique qui redonne immédiatement le sourire.',
    descriptionEn: 'A psychological spark that instantly brings back the smile.',
    cost: 25,
    effect: 'instant_morale',
    value: 30,
  },
  {
    id: 'boost_entrainement',
    name: "Boost d'entraînement",
    nameEn: 'Training boost',
    description: 'Augmente de 50% ta progression d’attributs pour la saison en cours.',
    descriptionEn: 'Increases your attribute growth by 50% for the current season.',
    cost: 55,
    effect: 'season_growth_boost',
    value: 0.5,
  },
];

export function getConsumable(id: string): Consumable | undefined {
  return CONSUMABLES.find((c) => c.id === id);
}
