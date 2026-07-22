import type { InvestmentId, MarketAssetProfile, PlayerState } from './types';
import { INVESTMENTS, getInvestmentDefinition } from '../data/investments';
import { getPrestigeAsset } from '../data/prestige';
import { nextFloat, nextChance } from './rng';
import { clamp, adjustMorale, adjustReputation, formatMoney, loc } from './util';
import { L } from '../i18n/language';

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
      const name = L(state.language, def.name, def.nameEn);
      narrative.push(
        loc(
          state,
          `${def.emoji} ${name} : ${delta >= 0 ? '+' : ''}${formatMoney(delta)} (total : ${formatMoney(holding.value)}).`,
          `${def.emoji} ${name}: ${delta >= 0 ? '+' : ''}${formatMoney(delta)} (total: ${formatMoney(holding.value)}).`,
        ),
      );
    }
  }
  return narrative;
}

// Étiquette de risque lisible, calculée depuis la volatilité EFFECTIVE de cette carrière (et non
// une valeur générique), pour informer le joueur sans lui révéler les chiffres bruts du moteur.
export function riskLabel(volatility: number, lang: import('../i18n/language').Language = 'fr'): { label: string; color: string } {
  const labels =
    lang === 'en'
      ? { none: 'No risk', low: 'Low risk', moderate: 'Moderate risk', high: 'High risk', extreme: 'Extreme risk' }
      : { none: 'Aucun risque', low: 'Risque faible', moderate: 'Risque modéré', high: 'Risque élevé', extreme: 'Risque extrême' };
  if (volatility <= 0.02) return { label: labels.none, color: '#8fd0a6' };
  if (volatility <= 0.12) return { label: labels.low, color: '#8fd0a6' };
  if (volatility <= 0.3) return { label: labels.moderate, color: '#e8b94a' };
  if (volatility <= 0.55) return { label: labels.high, color: '#e48a8a' };
  return { label: labels.extreme, color: '#e05a5a' };
}

export function investAmount(state: PlayerState, id: InvestmentId, amount: number): string {
  const def = getInvestmentDefinition(id);
  const clamped = Math.max(0, Math.min(Math.round(amount), state.savings));
  if (clamped <= 0) return loc(state, 'Montant invalide ou épargne insuffisante.', 'Invalid amount or insufficient savings.');
  state.savings -= clamped;
  const existing = state.investments[id];
  if (existing) {
    existing.principal += clamped;
    existing.value += clamped;
  } else {
    state.investments[id] = { id, principal: clamped, value: clamped };
  }
  const name = L(state.language, def.name, def.nameEn);
  return loc(state, `${def.emoji} ${formatMoney(clamped)} investis dans ${name}.`, `${def.emoji} ${formatMoney(clamped)} invested in ${name}.`);
}

export function withdrawInvestment(state: PlayerState, id: InvestmentId): string {
  const holding = state.investments[id];
  const def = getInvestmentDefinition(id);
  if (!holding || holding.value <= 0) return loc(state, 'Rien à retirer sur cet investissement.', 'Nothing to withdraw on this investment.');
  const amount = holding.value;
  state.savings += amount;
  delete state.investments[id];
  const name = L(state.language, def.name, def.nameEn);
  return loc(
    state,
    `${def.emoji} Position soldée sur ${name} : ${formatMoney(amount)} reversés sur ton épargne.`,
    `${def.emoji} Position closed on ${name}: ${formatMoney(amount)} moved back to your savings.`,
  );
}

export const GIFT_TIERS = [
  { id: 'petit', label: 'Petit geste', labelEn: 'Small gesture', cost: 500, effect: 3 },
  { id: 'genereux', label: 'Cadeau généreux', labelEn: 'Generous gift', cost: 3000, effect: 8 },
  { id: 'exceptionnel', label: 'Cadeau exceptionnel', labelEn: 'Exceptional gift', cost: 12000, effect: 15 },
] as const;

export type GiftTierId = (typeof GIFT_TIERS)[number]['id'];

export function giftFamily(state: PlayerState, tierId: GiftTierId): string {
  const tier = GIFT_TIERS.find((t) => t.id === tierId);
  if (!tier || state.savings < tier.cost) return loc(state, 'Épargne insuffisante pour ce cadeau.', 'Insufficient savings for this gift.');
  state.savings -= tier.cost;
  adjustMorale(state, tier.effect);
  const label = L(state.language, tier.label, tier.labelEn).toLowerCase();
  return loc(
    state,
    `Tu gâtes ta famille avec un ${label} (-${formatMoney(tier.cost)}, +Moral).`,
    `You spoil your family with a ${label} (-${formatMoney(tier.cost)}, +Morale).`,
  );
}

export function giftPartner(state: PlayerState, tierId: GiftTierId): string {
  const tier = GIFT_TIERS.find((t) => t.id === tierId);
  if (!tier || state.savings < tier.cost || state.relationship.status === 'celibataire') {
    return loc(state, 'Action impossible.', 'Action not possible.');
  }
  state.savings -= tier.cost;
  state.relationship.happiness = clamp(state.relationship.happiness + tier.effect, 0, 100);
  adjustMorale(state, Math.round(tier.effect / 2));
  const label = L(state.language, tier.label, tier.labelEn).toLowerCase();
  return loc(
    state,
    `Tu gâtes ${state.relationship.partnerName} avec un ${label} (-${formatMoney(tier.cost)}, +Moral, +Complicité).`,
    `You spoil ${state.relationship.partnerName} with a ${label} (-${formatMoney(tier.cost)}, +Morale, +Closeness).`,
  );
}

// Achat unique de prestige (résidence, objet...), financé par l'épargne : soit un gain de réputation
// immédiat et permanent, soit un bouclier qui amortit durablement les futures pertes de réputation.
export function purchasePrestigeAsset(state: PlayerState, assetId: string): string {
  const asset = getPrestigeAsset(assetId);
  if (!asset) return loc(state, 'Actif de prestige inconnu.', 'Unknown prestige asset.');
  if (state.prestigeAssets.includes(assetId)) return loc(state, 'Tu possèdes déjà cet actif.', 'You already own this asset.');
  if (state.savings < asset.cost) return loc(state, 'Épargne insuffisante pour cet achat.', 'Insufficient savings for this purchase.');

  state.savings -= asset.cost;
  state.prestigeAssets.push(assetId);
  const name = L(state.language, asset.name, asset.nameEn);

  if (asset.effect === 'permanent_reputation') {
    adjustReputation(state, asset.value);
    return loc(
      state,
      `${asset.emoji} ${name} acquis : ton prestige grimpe aussitôt (+${asset.value} Réputation, -${formatMoney(asset.cost)}).`,
      `${asset.emoji} ${name} acquired: your prestige instantly rises (+${asset.value} Reputation, -${formatMoney(asset.cost)}).`,
    );
  }

  state.reputationShield = clamp(state.reputationShield + asset.value, 0, 0.6);
  return loc(
    state,
    `${asset.emoji} ${name} acquis : un bouclier de réputation t'aidera désormais à encaisser les coups durs médiatiques (-${formatMoney(asset.cost)}).`,
    `${asset.emoji} ${name} acquired: a reputation shield will now help you absorb future media setbacks (-${formatMoney(asset.cost)}).`,
  );
}
