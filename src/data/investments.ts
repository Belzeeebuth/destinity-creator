import type { InvestmentId } from '../engine/types';

export interface InvestmentDefinition {
  id: InvestmentId;
  name: string;
  emoji: string;
  description: string;
  volatility: number; // amplitude des variations annuelles autour du rendement moyen
  meanReturn: number; // rendement moyen attendu par saison (0.05 = +5%)
  crashChance: number; // probabilité d'un choc négatif additionnel sévère
}

export const INVESTMENTS: InvestmentDefinition[] = [
  {
    id: 'livret',
    name: 'Livret sécurisé',
    emoji: '🏦',
    description: 'Rendement faible mais garanti : aucune perte possible, pour dormir tranquille.',
    volatility: 0,
    meanReturn: 0.02,
    crashChance: 0,
  },
  {
    id: 'immobilier',
    name: 'Immobilier locatif',
    emoji: '🏠',
    description: "Valeur qui s'apprécie lentement et régulièrement, avec un risque de marché occasionnel.",
    volatility: 0.06,
    meanReturn: 0.05,
    crashChance: 0.05,
  },
  {
    id: 'actions',
    name: 'Actions & fonds',
    emoji: '📈',
    description: 'Rendement correct sur la durée, mais des années plus creuses restent possibles.',
    volatility: 0.15,
    meanReturn: 0.07,
    crashChance: 0.08,
  },
  {
    id: 'crypto',
    name: 'Cryptomonnaies',
    emoji: '🪙',
    description: "Gains potentiellement énormes... ou effondrement brutal. À réserver à l'argent que tu es prêt à perdre.",
    volatility: 0.45,
    meanReturn: 0.12,
    crashChance: 0.22,
  },
];

export function getInvestmentDefinition(id: InvestmentId): InvestmentDefinition {
  const found = INVESTMENTS.find((i) => i.id === id);
  if (!found) throw new Error(`Investissement inconnu: ${id}`);
  return found;
}
