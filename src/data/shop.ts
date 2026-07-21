// Boutique : les jetons gagnés en accomplissant des quêtes/badges permettent de débloquer
// des avantages permanents, équipables (2 maximum) sur une future carrière.
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
  description: string;
  cost: number; // en jetons
  effect: AdvantageEffect;
  value: number;
}

export const ADVANTAGES: Advantage[] = [
  {
    id: 'prepa_physique',
    name: 'Préparateur physique personnel',
    description: 'Ralentit le déclin physique et accélère la progression liée à l’entraînement (+10%).',
    cost: 120,
    effect: 'growth',
    value: 0.1,
  },
  {
    id: 'staff_medical',
    name: 'Staff médical de pointe',
    description: 'Réduit sensiblement le risque de blessure sur toute la carrière.',
    cost: 140,
    effect: 'injury_shield',
    value: 0.35,
  },
  {
    id: 'carnet_adresses',
    name: 'Carnet d’adresses doré',
    description: 'Tu démarres avec une réputation initiale plus élevée, plus vite repéré des recruteurs.',
    cost: 90,
    effect: 'reputation_start',
    value: 12,
  },
  {
    id: 'mental_acier',
    name: 'Mental d’acier',
    description: 'Réduit fortement les risques d’incidents disciplinaires face aux tentations.',
    cost: 100,
    effect: 'discipline_shield',
    value: 0.4,
  },
  {
    id: 'negociateur',
    name: 'Négociateur hors pair',
    description: 'Tes contrats et primes de signature sont systématiquement meilleurs.',
    cost: 110,
    effect: 'wage_boost',
    value: 0.2,
  },
  {
    id: 'reseau_scouts',
    name: 'Réseau de recruteurs internationaux',
    description: 'Tu reçois davantage d’offres, et de meilleure qualité, à chaque fenêtre de transfert.',
    cost: 130,
    effect: 'scouting',
    value: 0.3,
  },
  {
    id: 'famille_soudee',
    name: 'Famille soudée',
    description: 'Un socle familial stable : ton moral de départ est nettement plus élevé.',
    cost: 70,
    effect: 'morale_start',
    value: 15,
  },
  {
    id: 'genes_talent',
    name: 'Étincelle de talent',
    description: 'Ton potentiel de progression est relevé sur tous les attributs.',
    cost: 160,
    effect: 'potential',
    value: 5,
  },
  {
    id: 'hygiene_de_vie',
    name: 'Hygiène de vie exemplaire',
    description: 'Ta forme physique de départ et sa récupération saisonnière sont meilleures.',
    cost: 80,
    effect: 'fitness',
    value: 10,
  },
  {
    id: 'formation_elite',
    name: 'Formation d’élite dès l’enfance',
    description: 'Tes attributs de départ bénéficient d’un coup de pouce clé en main.',
    cost: 150,
    effect: 'youth_headstart',
    value: 4,
  },
];

export function getAdvantage(id: string): Advantage | undefined {
  return ADVANTAGES.find((a) => a.id === id);
}

export function getEquippedEffect(equippedIds: string[], effect: AdvantageEffect): number {
  return equippedIds
    .map((id) => getAdvantage(id))
    .filter((a): a is Advantage => !!a && a.effect === effect)
    .reduce((sum, a) => sum + a.value, 0);
}

export const MAX_EQUIPPED_ADVANTAGES = 2;
