import { POSITIONS, ATTRIBUTE_LABELS, type PositionCode } from '../../data/positions';

interface Props {
  value: PositionCode | null;
  onSelect: (code: PositionCode) => void;
}

export default function PositionStep({ value, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-2xl text-ink-100">Choisis ton poste</h2>
        <p className="mt-1 text-sm text-ink-300">
          Le poste détermine les attributs qui comptent le plus dans ta progression et ta note globale.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {POSITIONS.map((position) => {
          const active = value === position.code;
          return (
            <button
              key={position.code}
              onClick={() => onSelect(position.code)}
              className={`card flex flex-col gap-2 p-4 text-left transition ${active ? 'border-gold-500/60 ring-1 ring-gold-500/40' : 'hover:border-white/25'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-lg text-ink-100">{position.name}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-ink-300">{position.short}</span>
              </div>
              <p className="text-sm text-ink-300">{position.description}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {position.keyAttributes.map((attr) => (
                  <span key={attr} className="rounded-full bg-gold-500/10 px-2 py-0.5 text-[11px] text-gold-400">
                    {ATTRIBUTE_LABELS[attr]}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
