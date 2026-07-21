export interface Lifestyle {
  id: string;
  name: string;
  emoji: string;
  description: string;
  growthModifier: number; // multiplicateur de progression des attributs (1 = neutre)
  injuryRiskModifier: number; // multiplicateur du risque de blessure (1 = neutre)
  incidentRiskModifier: number; // multiplicateur du risque d'incident disciplinaire (1 = neutre)
  disciplineModifier: number; // ajustement direct de la discipline de départ
  moraleModifier: number;
  traits: string[];
}

export const LIFESTYLES: Lifestyle[] = [
  {
    id: 'studieux',
    name: 'Discipliné et studieux',
    emoji: '📚',
    description:
      "Étude et foot en parallèle, coucher à heure fixe, zéro excès. Une progression stable et sans surprise, mais un plan de carrière parfois trop prudent.",
    growthModifier: 1.05,
    injuryRiskModifier: 0.8,
    incidentRiskModifier: 0.5,
    disciplineModifier: 12,
    moraleModifier: 0,
    traits: ['serieux'],
  },
  {
    id: 'obsede',
    name: 'Obsédé par le foot',
    emoji: '⚽',
    description:
      "Un ballon aux pieds du matin au soir, chaque minute libre passée au terrain. La progression technique est la plus rapide qui soit, au prix d'un risque de surentraînement.",
    growthModifier: 1.25,
    injuryRiskModifier: 1.3,
    incidentRiskModifier: 0.7,
    disciplineModifier: 4,
    moraleModifier: 2,
    traits: ['acharne', 'monomaniaque'],
  },
  {
    id: 'insouciant',
    name: 'Fêtard et insouciant',
    emoji: '🎉',
    description:
      "Sorties entre amis, réseaux sociaux, vie sociale intense. Charismatique et populaire, mais l'assiduité à l'entraînement en pâtit et les tentations rôdent.",
    growthModifier: 0.85,
    injuryRiskModifier: 1.1,
    incidentRiskModifier: 1.8,
    disciplineModifier: -15,
    moraleModifier: 8,
    traits: ['fetard', 'populaire_reseaux'],
  },
  {
    id: 'equilibre',
    name: 'Équilibré',
    emoji: '⚖️',
    description:
      "Un peu de tout : le foot, les amis, quelques loisirs. Rien d'extrême, une trajectoire sans grand risque ni grand coup d'accélérateur.",
    growthModifier: 1,
    injuryRiskModifier: 1,
    incidentRiskModifier: 1,
    disciplineModifier: 0,
    moraleModifier: 4,
    traits: ['stable'],
  },
  {
    id: 'spartiate',
    name: 'Spartiate (hygiène de vie extrême)',
    emoji: '🧘',
    description:
      "Sommeil chronométré, nutrition millimétrée, aucune vie sociale. La longévité physique s'en trouve grandement renforcée pour les dernières saisons de carrière, au prix d'un quotidien austère.",
    growthModifier: 1.1,
    injuryRiskModifier: 0.6,
    incidentRiskModifier: 0.3,
    disciplineModifier: 18,
    moraleModifier: -6,
    traits: ['ascete', 'longevite'],
  },
];

export function getLifestyle(id: string): Lifestyle {
  const found = LIFESTYLES.find((l) => l.id === id);
  if (!found) throw new Error(`Mode de vie inconnu: ${id}`);
  return found;
}
