import { useState } from 'react';
import type { PlayerState } from '../../engine/types';
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, ATTRIBUTE_ICONS, getPosition } from '../../data/positions';
import type { AttributeKey } from '../../data/positions';
import { CONSUMABLES } from '../../data/shop';
import { useGameStore } from '../../state/store';
import AttributesPanel from './AttributesPanel';

export default function PreseasonPanel({ career }: { career: PlayerState }) {
  const chooseFocus = useGameStore((s) => s.chooseFocus);
  const consumablesOwned = useGameStore((s) => s.meta.consumablesOwned);
  const activateConsumable = useGameStore((s) => s.activateConsumable);
  const position = getPosition(career.positionCode);
  const visibleAttrs = ATTRIBUTE_KEYS.filter((k) => k !== 'reflexes' || position.code === 'GK');
  const [picked, setPicked] = useState<AttributeKey | null>(null);
  const ownedConsumables = CONSUMABLES.filter((c) => (consumablesOwned[c.id] ?? 0) > 0);

  function handlePick(attr: AttributeKey) {
    if (picked) return;
    setPicked(attr);
    setTimeout(() => chooseFocus(attr), 320);
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="card p-5">
        <h2 className="font-display text-2xl text-ink-100">Préparation de la saison {career.season}</h2>
        <p className="mt-1 text-sm text-ink-300">
          Choisis l'attribut sur lequel concentrer ton entraînement cette saison. Il progressera plus vite que les autres.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visibleAttrs.map((attr) => (
            <button
              key={attr}
              onClick={() => handlePick(attr)}
              className={`choice-option rounded-lg px-3 py-2 text-sm ${
                picked === attr ? 'is-selected' : 'btn-outline hover:border-gold-500/50 hover:text-gold-400'
              }`}
            >
              <span aria-hidden>{ATTRIBUTE_ICONS[attr]}</span> {ATTRIBUTE_LABELS[attr]}
            </button>
          ))}
        </div>

        {ownedConsumables.length > 0 && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-ink-500">🎒 Objets disponibles</p>
            <div className="flex flex-col gap-2">
              {ownedConsumables.map((c) => (
                <button
                  key={c.id}
                  onClick={() => activateConsumable(c.id)}
                  className="btn-outline flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:border-gold-500/50 hover:text-gold-400"
                >
                  <span>{c.name}</span>
                  <span className="text-xs text-ink-500">x{consumablesOwned[c.id]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <AttributesPanel career={career} />
    </div>
  );
}
