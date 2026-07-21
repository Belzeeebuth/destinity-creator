import { ADVANTAGES, MAX_EQUIPPED_ADVANTAGES } from '../data/shop';
import { useGameStore } from '../state/store';

export default function BoutiquePage() {
  const meta = useGameStore((s) => s.meta);
  const purchaseAdvantage = useGameStore((s) => s.purchaseAdvantage);
  const setEquippedAdvantages = useGameStore((s) => s.setEquippedAdvantages);

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
          <h1 className="font-display text-3xl text-ink-100">🛒 Boutique</h1>
          <p className="mt-1 text-sm text-ink-300">
            Dépense les jetons gagnés en fin de carrière pour débloquer des avantages permanents.
            Équipe-en jusqu'à {MAX_EQUIPPED_ADVANTAGES} pour ta prochaine carrière.
          </p>
        </div>
        <div className="rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-2 font-display text-lg text-gold-400">
          🪙 {meta.tokens}
        </div>
      </div>

      <p className="mb-4 text-xs text-ink-500">
        Équipés pour la prochaine carrière : {meta.equippedAdvantageIds.length}/{MAX_EQUIPPED_ADVANTAGES}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ADVANTAGES.map((advantage) => {
          const owned = meta.unlockedAdvantageIds.includes(advantage.id);
          const equipped = meta.equippedAdvantageIds.includes(advantage.id);
          const canAfford = meta.tokens >= advantage.cost;
          const equipDisabled = !equipped && meta.equippedAdvantageIds.length >= MAX_EQUIPPED_ADVANTAGES;

          return (
            <div key={advantage.id} className={`card flex flex-col gap-2 p-4 ${equipped ? 'border-gold-500/60' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="font-display text-lg text-ink-100">{advantage.name}</span>
                {!owned && <span className="text-sm font-semibold text-gold-400">🪙 {advantage.cost}</span>}
              </div>
              <p className="text-sm text-ink-300">{advantage.description}</p>
              <div className="mt-1">
                {owned ? (
                  <button
                    onClick={() => toggleEquip(advantage.id)}
                    disabled={equipDisabled}
                    className={`w-full rounded-full py-1.5 text-sm ${
                      equipped ? 'btn-gold' : 'btn-outline'
                    } disabled:opacity-40`}
                  >
                    {equipped ? 'Équipé ✓' : equipDisabled ? 'Emplacements pleins' : 'Équiper'}
                  </button>
                ) : (
                  <button
                    onClick={() => purchaseAdvantage(advantage.id)}
                    disabled={!canAfford}
                    className="btn-outline w-full rounded-full py-1.5 text-sm disabled:opacity-40"
                  >
                    Débloquer
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
