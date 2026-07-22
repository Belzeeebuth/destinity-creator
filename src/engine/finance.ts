import type { InvestmentId, MarketAssetProfile, PlayerState } from './types';
import { INVESTMENTS, getInvestmentDefinition } from '../data/investments';
import { nextFloat, nextChance } from './rng';
import { clamp, adjustMorale, formatMoney } from './util';

// Tire le profil de risque/rendement effectif de chaque actif POUR CETTE CARRIÈRE, à partir de ses
// valeurs de base, en appliquant un facteur aléatoire propre à la partie (sauf le livret, garanti) :
// un même actif ne se comporte donc jamais exactement pareil d'une carrière à l'autre.
export function generateMarketProfile(state: PlayerState): Record<InvestmentId, MarketAssetProfile> {
  const profile = {} as Record<InvestmentId, MarketAssetProfile>;
  fillMissingMarketProfile(state, profile);
  return profile;
}

// Complète un profil de marché existant avec les actifs qui lui manquent (nouvelle carrière vierge,
// ou sauvegarde plus ancienne créée avant l'ajout de nouveaux actifs au catalogue).
export function fillMissingMarketProfile(state: PlayerState, profile: Record<InvestmentId, MarketAssetProfile>): void {
  for (const def of INVESTMENTS) {
    if (profile[def.id]) continue;
    if (!def.randomized) {
      profile[def.id] = { volatility: def.baseVolatility, meanReturn: def.baseMeanReturn, crashChance: def.baseCrashChance };
      continue;
    }
    const volatilityMult = 0.55 + nextFloat(state) * 0.9; // 0.55x à 1.45x la valeur de base
    const returnMult = 0.4 + nextFloat(state) * 1.3; // 0.4x à 1.7x la valeur de base
    const crashMult = 0.5 + nextFloat(state) * 1.2; // 0.5x à 1.7x la valeur de base
    profile[def.id] = {
      volatility: clamp(def.baseVolatility * volatilityMult, 0, 1.3),
      meanReturn: def.baseMeanReturn * returnMult,
      crashChance: clamp(def.baseCrashChance * crashMult, 0, 0.65),
    };
  }
}

// Fait évoluer chaque position détenue d'une saison sur l'autre (rendement moyen +/- volatilité,
// avec un risque de choc négatif additionnel propre à chaque classe d'actif et à cette carrière).
export function evolveInvestments(state: PlayerState): string[] {
  const narrative: string[] = [];
  for (const def of INVESTMENTS) {
    const holding = state.investments[def.id];
    if (!holding || holding.value <= 0) continue;
    const profile = state.marketProfile[def.id];
    let changePct = profile.meanReturn + (nextFloat(state) - 0.5) * 2 * profile.volatility;
    if (profile.crashChance > 0 && nextChance(state, profile.crashChance)) {
      changePct -= 0.25 + nextFloat(state) * 0.35;
    }
    const before = holding.value;
    holding.value = Math.max(0, Math.round(holding.value * (1 + changePct)));
    const delta = holding.value - before;
    if (before > 0 && Math.abs(delta) >= Math.max(30, before * 0.03)) {
      narrative.push(
        `${def.emoji} ${def.name} : ${delta >= 0 ? '+' : ''}${formatMoney(delta)} (total : ${formatMoney(holding.value)}).`,
      );
    }
  }
  return narrative;
}

// Étiquette de risque lisible, calculée depuis la volatilité EFFECTIVE de cette carrière (et non
// une valeur générique), pour informer le joueur sans lui révéler les chiffres bruts du moteur.
export function riskLabel(volatility: number): { label: string; color: string } {
  if (volatility <= 0.02) return { label: 'Aucun risque', color: '#8fd0a6' };
  if (volatility <= 0.12) return { label: 'Risque faible', color: '#8fd0a6' };
  if (volatility <= 0.3) return { label: 'Risque modéré', color: '#e8b94a' };
  if (volatility <= 0.55) return { label: 'Risque élevé', color: '#e48a8a' };
  return { label: 'Risque extrême', color: '#e05a5a' };
}

export function investAmount(state: PlayerState, id: InvestmentId, amount: number): string {
  const def = getInvestmentDefinition(id);
  const clamped = Math.max(0, Math.min(Math.round(amount), state.savings));
  if (clamped <= 0) return 'Montant invalide ou épargne insuffisante.';
  state.savings -= clamped;
  const existing = state.investments[id];
  if (existing) {
    existing.principal += clamped;
    existing.value += clamped;
  } else {
    state.investments[id] = { id, principal: clamped, value: clamped };
  }
  return `${def.emoji} ${formatMoney(clamped)} investis dans ${def.name}.`;
}

export function withdrawInvestment(state: PlayerState, id: InvestmentId): string {
  const holding = state.investments[id];
  const def = getInvestmentDefinition(id);
  if (!holding || holding.value <= 0) return 'Rien à retirer sur cet investissement.';
  const amount = holding.value;
  state.savings += amount;
  delete state.investments[id];
  return `${def.emoji} Position soldée sur ${def.name} : ${formatMoney(amount)} reversés sur ton épargne.`;
}

export const GIFT_TIERS = [
  { id: 'petit', label: 'Petit geste', cost: 500, effect: 3 },
  { id: 'genereux', label: 'Cadeau généreux', cost: 3000, effect: 8 },
  { id: 'exceptionnel', label: 'Cadeau exceptionnel', cost: 12000, effect: 15 },
] as const;

export type GiftTierId = (typeof GIFT_TIERS)[number]['id'];

export function giftFamily(state: PlayerState, tierId: GiftTierId): string {
  const tier = GIFT_TIERS.find((t) => t.id === tierId);
  if (!tier || state.savings < tier.cost) return 'Épargne insuffisante pour ce cadeau.';
  state.savings -= tier.cost;
  adjustMorale(state, tier.effect);
  return `Tu gâtes ta famille avec un ${tier.label.toLowerCase()} (-${formatMoney(tier.cost)}, +Moral).`;
}

export function giftPartner(state: PlayerState, tierId: GiftTierId): string {
  const tier = GIFT_TIERS.find((t) => t.id === tierId);
  if (!tier || state.savings < tier.cost || state.relationship.status === 'celibataire') {
    return 'Action impossible.';
  }
  state.savings -= tier.cost;
  state.relationship.happiness = clamp(state.relationship.happiness + tier.effect, 0, 100);
  adjustMorale(state, Math.round(tier.effect / 2));
  return `Tu gâtes ${state.relationship.partnerName} avec un ${tier.label.toLowerCase()} (-${formatMoney(tier.cost)}, +Moral, +Complicité).`;
}
