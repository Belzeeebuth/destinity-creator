import type { InvestmentId } from '../engine/types';

export interface InvestmentDefinition {
  id: InvestmentId;
  name: string;
  symbol?: string; // ticker, pour les cryptos
  emoji: string;
  description: string;
  category: 'traditionnel' | 'crypto';
  volatility: number; // amplitude des variations annuelles autour du rendement moyen
  meanReturn: number; // rendement moyen attendu par saison (0.05 = +5%)
  crashChance: number; // probabilité d'un choc négatif additionnel sévère
}

export const TRADITIONAL_INVESTMENTS: InvestmentDefinition[] = [
  {
    id: 'livret',
    name: 'Livret sécurisé',
    emoji: '🏦',
    description: 'Rendement faible mais garanti : aucune perte possible, pour dormir tranquille.',
    category: 'traditionnel',
    volatility: 0,
    meanReturn: 0.02,
    crashChance: 0,
  },
  {
    id: 'immobilier',
    name: 'Immobilier locatif',
    emoji: '🏠',
    description: "Valeur qui s'apprécie lentement et régulièrement, avec un risque de marché occasionnel.",
    category: 'traditionnel',
    volatility: 0.06,
    meanReturn: 0.05,
    crashChance: 0.05,
  },
  {
    id: 'actions',
    name: 'Actions & fonds',
    emoji: '📈',
    description: 'Rendement correct sur la durée, mais des années plus creuses restent possibles.',
    category: 'traditionnel',
    volatility: 0.15,
    meanReturn: 0.07,
    crashChance: 0.08,
  },
];

// Marché crypto : plusieurs actifs distincts avec leur propre profil de risque, du plus établi
// (Bitcoin) au plus spéculatif (mème-coin fictif) — noms de cryptomonnaies publiques et génériques,
// pas de cours réel répliqué, tout est simulé par le moteur du jeu.
export const CRYPTO_INVESTMENTS: InvestmentDefinition[] = [
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    emoji: '₿',
    description: "La plus établie des cryptomonnaies. Volatile, mais relativement le moins agité du marché.",
    category: 'crypto',
    volatility: 0.35,
    meanReturn: 0.14,
    crashChance: 0.12,
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    emoji: 'Ξ',
    description: 'Deuxième capitalisation du marché, portée par ses contrats intelligents.',
    category: 'crypto',
    volatility: 0.42,
    meanReturn: 0.13,
    crashChance: 0.15,
  },
  {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    emoji: '◎',
    description: 'Rapide et populaire, mais réputée pour ses envolées et ses chutes spectaculaires.',
    category: 'crypto',
    volatility: 0.55,
    meanReturn: 0.16,
    crashChance: 0.2,
  },
  {
    id: 'bnb',
    name: 'BNB',
    symbol: 'BNB',
    emoji: '🔶',
    description: "Adossée à l'une des plus grandes plateformes d'échange, relativement disciplinée.",
    category: 'crypto',
    volatility: 0.4,
    meanReturn: 0.1,
    crashChance: 0.15,
  },
  {
    id: 'xrp',
    name: 'XRP',
    symbol: 'XRP',
    emoji: '✕',
    description: 'Orientée paiements internationaux, sujette à des à-coups réglementaires.',
    category: 'crypto',
    volatility: 0.45,
    meanReturn: 0.08,
    crashChance: 0.18,
  },
  {
    id: 'cardano',
    name: 'Cardano',
    symbol: 'ADA',
    emoji: '🔷',
    description: 'Développement académique et prudent, progression plus lente mais plus posée.',
    category: 'crypto',
    volatility: 0.5,
    meanReturn: 0.09,
    crashChance: 0.2,
  },
  {
    id: 'polkadot',
    name: 'Polkadot',
    symbol: 'DOT',
    emoji: '⚫',
    description: 'Vise à connecter plusieurs blockchains entre elles. Encore jeune, encore instable.',
    category: 'crypto',
    volatility: 0.48,
    meanReturn: 0.09,
    crashChance: 0.19,
  },
  {
    id: 'dogecoin',
    name: 'Dogecoin',
    symbol: 'DOGE',
    emoji: '🐕',
    description: "Née comme une blague, portée par les réseaux sociaux plus que par les fondamentaux.",
    category: 'crypto',
    volatility: 0.7,
    meanReturn: 0.05,
    crashChance: 0.3,
  },
  {
    id: 'moonshiba',
    name: 'MoonShiba (mème-coin fictif)',
    symbol: 'MSHB',
    emoji: '🚀',
    description: 'Un actif totalement fictif et ultra-spéculatif : jackpot ou anéantissement total.',
    category: 'crypto',
    volatility: 0.95,
    meanReturn: 0.02,
    crashChance: 0.42,
  },
];

export const INVESTMENTS: InvestmentDefinition[] = [...TRADITIONAL_INVESTMENTS, ...CRYPTO_INVESTMENTS];

export function getInvestmentDefinition(id: InvestmentId): InvestmentDefinition {
  const found = INVESTMENTS.find((i) => i.id === id);
  if (!found) throw new Error(`Investissement inconnu: ${id}`);
  return found;
}
