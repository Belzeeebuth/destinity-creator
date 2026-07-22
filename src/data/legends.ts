import type { PositionCode } from './positions';

// Mode Histoire : carrières légendaires (fictives) à rejouer avec les mêmes conditions
// de départ, en tentant de faire mieux que le score de légende affiché.
export interface LegendCareer {
  id: string;
  name: string;
  countryCode: string;
  positionCode: PositionCode;
  backgroundId: string;
  lifestyleId: string;
  agentId: string;
  seed: number;
  tagline: string;
  taglineEn: string;
  finalStats: {
    goals: number;
    assists: number;
    caps: number;
    trophies: number;
    finalOverall: number;
    legendScore: number;
  };
}

export const LEGEND_CAREERS: LegendCareer[] = [
  {
    id: 'legend_pele_like',
    name: 'Nascimento "O Rei"',
    countryCode: 'BR',
    positionCode: 'ST',
    backgroundId: 'precaire',
    lifestyleId: 'obsede',
    agentId: 'aucun',
    seed: 194010,
    tagline: 'Parti de rien dans les rues de Bahia, devenu le roi du monde.',
    taglineEn: 'Started from nothing in the streets of Bahia, became the king of the world.',
    finalStats: { goals: 412, assists: 118, caps: 92, trophies: 9, finalOverall: 96, legendScore: 980 },
  },
  {
    id: 'legend_libero',
    name: 'Franz "Der Kaiser" Wexler',
    countryCode: 'DE',
    positionCode: 'CB',
    backgroundId: 'classe_moyenne',
    lifestyleId: 'studieux',
    agentId: 'local',
    seed: 194100,
    tagline: 'Le libéro qui réinventait la défense en portant le brassard.',
    taglineEn: 'The sweeper who reinvented defending while wearing the armband.',
    finalStats: { goals: 44, assists: 61, caps: 108, trophies: 11, finalOverall: 94, legendScore: 910 },
  },
  {
    id: 'legend_petit_pays',
    name: 'Andri Sólheim',
    countryCode: 'IS',
    positionCode: 'AM',
    backgroundId: 'rural',
    lifestyleId: 'equilibre',
    agentId: 'famille',
    seed: 194200,
    tagline: "Venu d'un archipel de 300 000 âmes, il a fait vaciller les plus grands d'Europe.",
    taglineEn: 'From an archipelago of 300,000 souls, he made the giants of Europe wobble.',
    finalStats: { goals: 156, assists: 201, caps: 84, trophies: 4, finalOverall: 91, legendScore: 840 },
  },
  {
    id: 'legend_micro_nation',
    name: 'Luca Bertoni',
    countryCode: 'SM',
    positionCode: 'WI',
    backgroundId: 'populaire',
    lifestyleId: 'obsede',
    agentId: 'agence',
    seed: 194300,
    tagline: "Depuis Saint-Marin, moins de 35 000 habitants, jusqu'aux sommets européens.",
    taglineEn: 'From San Marino, fewer than 35,000 people, all the way to the top of Europe.',
    finalStats: { goals: 187, assists: 143, caps: 71, trophies: 3, finalOverall: 89, legendScore: 790 },
  },
  {
    id: 'legend_gardien',
    name: 'Iker Salaberri',
    countryCode: 'ES',
    positionCode: 'GK',
    backgroundId: 'dynastie',
    lifestyleId: 'spartiate',
    agentId: 'agence',
    seed: 194400,
    tagline: "Le dernier rempart d'une génération dorée, increvable jusqu'à 44 ans.",
    taglineEn: 'The last line of defense of a golden generation, indestructible until age 44.',
    finalStats: { goals: 0, assists: 3, caps: 130, trophies: 14, finalOverall: 93, legendScore: 900 },
  },
  {
    id: 'legend_tardif',
    name: 'Emeka Obiora',
    countryCode: 'NG',
    positionCode: 'CM',
    backgroundId: 'precaire',
    lifestyleId: 'insouciant',
    agentId: 'aucun',
    seed: 194500,
    tagline: "Repéré tard, parti de très bas, devenu le métronome d'une décennie entière.",
    taglineEn: 'Spotted late, started from way down, became the metronome of an entire decade.',
    finalStats: { goals: 88, assists: 176, caps: 63, trophies: 5, finalOverall: 90, legendScore: 800 },
  },
];

export function getLegend(id: string): LegendCareer | undefined {
  return LEGEND_CAREERS.find((l) => l.id === id);
}
