import type { PlayerState } from '../../engine/types';
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, getPosition } from '../../data/positions';
import type { AttributeKey } from '../../data/positions';
import { useGameStore } from '../../state/store';
import AttributesPanel from './AttributesPanel';

export default function PreseasonPanel({ career }: { career: PlayerState }) {
  const chooseFocus = useGameStore((s) => s.chooseFocus);
  const position = getPosition(career.positionCode);
  const visibleAttrs = ATTRIBUTE_KEYS.filter((k) => k !== 'reflexes' || position.code === 'GK');

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
              onClick={() => chooseFocus(attr as AttributeKey)}
              className="btn-outline rounded-lg px-3 py-2 text-sm hover:border-gold-500/50 hover:text-gold-400"
            >
              {ATTRIBUTE_LABELS[attr]}
            </button>
          ))}
        </div>
      </div>
      <AttributesPanel career={career} />
    </div>
  );
}
