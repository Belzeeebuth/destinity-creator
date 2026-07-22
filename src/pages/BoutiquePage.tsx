import { ADVANTAGES, MAX_EQUIPPED_ADVANTAGES, CONSUMABLES, advantageValueAtLevel, advantageUpgradeCost } from '../data/shop';
import { useGameStore } from '../state/store';
import { L } from '../i18n/language';
import { ui } from '../i18n/ui';

export default function BoutiquePage() {
  const meta = useGameStore((s) => s.meta);
  const language = useGameStore((s) => s.language);
  const upgradeAdvantage = useGameStore((s) => s.upgradeAdvantage);
  const setEquippedAdvantages = useGameStore((s) => s.setEquippedAdvantages);
  const purchaseConsumable = useGameStore((s) => s.purchaseConsumable);

  function toggleEquip(id: string) {
    const isEquipped = meta.equippedAdvantageIds.includes(id);
    if (isEquipped) {
      setEquippedAdvantages(meta.equippedAdvantageIds.filter((x) => x !== id));
    } else if (meta.equippedAdvantageIds.length < MAX_EQUIPPED_ADVANTAGES) {
      setEquippedAdvantages([...meta.equippedAdvantageIds, id]);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink-100">{ui(language, 'boutiqueTitle')}</h1>
          <p className="mt-1 text-sm text-ink-300">
            {ui(language, 'boutiqueSubtitle').replace('{n}', String(MAX_EQUIPPED_ADVANTAGES))}
          </p>
        </div>
        <div className="rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-2 font-display text-lg text-gold-400">
          🪙 {meta.tokens}
        </div>
      </div>

      <p className="mb-4 text-xs text-ink-500">
        {ui(language, 'boutiqueEquippedFor')} {meta.equippedAdvantageIds.length}/{MAX_EQUIPPED_ADVANTAGES}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ADVANTAGES.map((advantage) => {
          const level = meta.advantageLevels[advantage.id] ?? 0;
          const owned = level > 0;
          const maxed = level >= advantage.maxLevel;
          const equipped = meta.equippedAdvantageIds.includes(advantage.id);
          const upgradeCost = advantageUpgradeCost(advantage, level);
          const canAfford = meta.tokens >= upgradeCost;
          const equipDisabled = !equipped && meta.equippedAdvantageIds.length >= MAX_EQUIPPED_ADVANTAGES;
          const currentValue = advantageValueAtLevel(advantage, level);
          const nextValue = advantageValueAtLevel(advantage, level + 1);

          return (
            <div key={advantage.id} className={`card flex flex-col gap-2 p-4 ${equipped ? 'border-gold-500/60' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="font-display text-lg text-ink-100">{L(language, advantage.name, advantage.nameEn)}</span>
                <span
                  className="flex gap-0.5"
                  aria-label={`${ui(language, 'boutiqueLevelLabel')} ${level} ${ui(language, 'boutiqueOfLabel')} ${advantage.maxLevel}`}
                >
                  {Array.from({ length: advantage.maxLevel }).map((_, i) => (
                    <span key={i} className={i < level ? 'text-gold-400' : 'text-white/15'}>
                      ★
                    </span>
                  ))}
                </span>
              </div>
              <p className="text-sm text-ink-300">{L(language, advantage.description, advantage.descriptionEn)}</p>
              {owned && (
                <p className="text-xs text-ink-500">
                  {ui(language, 'boutiqueCurrentEffect')} +{formatEffectValue(currentValue)}
                </p>
              )}
              <div className="mt-1 flex flex-col gap-2">
                {!maxed && (
                  <button
                    onClick={() => upgradeAdvantage(advantage.id)}
                    disabled={!canAfford}
                    className="btn-outline w-full rounded-full py-1.5 text-sm disabled:opacity-40"
                  >
                    {owned
                      ? `${ui(language, 'boutiqueUpgradeTo')} +${formatEffectValue(nextValue)}`
                      : ui(language, 'boutiqueUnlockLevel1')}{' '}
                    (🪙 {upgradeCost})
                  </button>
                )}
                {owned && (
                  <button
                    onClick={() => toggleEquip(advantage.id)}
                    disabled={equipDisabled}
                    className={`w-full rounded-full py-1.5 text-sm ${equipped ? 'btn-gold' : 'btn-outline'} disabled:opacity-40`}
                  >
                    {equipped
                      ? ui(language, 'boutiqueEquippedCheck')
                      : equipDisabled
                        ? ui(language, 'boutiqueSlotsFull')
                        : ui(language, 'boutiqueEquipButton')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mb-4 mt-10 font-display text-2xl text-ink-100">{ui(language, 'boutiqueConsumablesTitle')}</h2>
      <p className="mb-4 text-sm text-ink-300">{ui(language, 'boutiqueConsumablesSubtitle')}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CONSUMABLES.map((c) => {
          const owned = meta.consumablesOwned[c.id] ?? 0;
          const canAfford = meta.tokens >= c.cost;
          return (
            <div key={c.id} className="card flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-lg text-ink-100">{L(language, c.name, c.nameEn)}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-ink-300">
                  {ui(language, 'boutiqueInStock')} {owned}
                </span>
              </div>
              <p className="text-sm text-ink-300">{L(language, c.description, c.descriptionEn)}</p>
              <button
                onClick={() => purchaseConsumable(c.id)}
                disabled={!canAfford}
                className="btn-outline w-full rounded-full py-1.5 text-sm disabled:opacity-40"
              >
                {ui(language, 'boutiqueBuyButton')} (🪙 {c.cost})
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatEffectValue(value: number): string {
  if (value < 1.5 && value > -1.5 && value !== 0) return `${Math.round(value * 100)}%`;
  return `${Math.round(value * 10) / 10}`;
}
