import { useGameStore } from '../../state/store';
import { L } from '../../i18n/language';

interface ChoiceItem {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  emoji?: string;
}

interface Props<T extends ChoiceItem> {
  title: string;
  subtitle: string;
  items: T[];
  value: string | null;
  onSelect: (id: string) => void;
}

export default function SimpleChoiceGrid<T extends ChoiceItem>({ title, subtitle, items, value, onSelect }: Props<T>) {
  const language = useGameStore((s) => s.language);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-2xl text-ink-100">{title}</h2>
        <p className="mt-1 text-sm text-ink-300">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const active = value === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`card choice-option flex flex-col gap-1.5 p-4 text-left ${active ? 'is-selected' : 'hover:border-white/25'}`}
            >
              <span className="flex items-center gap-2 font-display text-lg text-ink-100">
                {item.emoji && <span aria-hidden>{item.emoji}</span>}
                {L(language, item.name, item.nameEn)}
              </span>
              <p className="text-sm text-ink-300">{L(language, item.description, item.descriptionEn)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
