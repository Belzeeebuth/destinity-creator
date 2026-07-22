import type { InvestmentId, PlayerState } from './types';
import { INVESTMENTS, getInvestmentDefinition } from '../data/investments';
import { nextFloat, nextChance } from './rng';
import { clamp, adjustMorale, formatMoney } from './util';

// Fait évoluer chaque position détenue d'une saison sur l'autre (rendement moyen +/- volatilité,
// avec un risque de choc négatif additionnel propre à chaque classe d'actif).
export function evolveInvestments(state: PlayerState): string[] {
  const narrative: string[] = [];
  for (const def of INVESTMENTS) {
    const holding = state.investments[def.id];
    if (!holding || holding.value <= 0) continue;
    let changePct = def.meanReturn + (nextFloat(state) - 0.5) * 2 * def.volatility;
    if (def.crashChance > 0 && nextChance(state, def.crashChance)) {
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
