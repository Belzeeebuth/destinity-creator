import type { PlayerState } from '../../engine/types';
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, ATTRIBUTE_LABELS_EN, ATTRIBUTE_ICONS, ATTRIBUTE_DESCRIPTIONS, ATTRIBUTE_DESCRIPTIONS_EN, getPosition } from '../../data/positions';
import { overallRating } from '../../engine/types';
import { useGameStore } from '../../state/store';
import { ui } from '../../i18n/ui';

export default function AttributesPanel({ career }: { career: PlayerState }) {
  const language = useGameStore((s) => s.language);
  const position = getPosition(career.positionCode);
  const overall = overallRating(career.attributes, position.weights);
  const visibleAttrs = ATTRIBUTE_KEYS.filter((k) => k !== 'reflexes' || position.code === 'GK');
  const labels = language === 'en' ? ATTRIBUTE_LABELS_EN : ATTRIBUTE_LABELS;
  const descriptions = language === 'en' ? ATTRIBUTE_DESCRIPTIONS_EN : ATTRIBUTE_DESCRIPTIONS;

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg text-ink-100">{ui(language, 'attributesTitle')}</h3>
        <span className="rounded-full bg-gold-500/15 px-3 py-1 text-sm font-semibold text-gold-400">
          {overall.toFixed(1)} {ui(language, 'attributesOverall')}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {visibleAttrs.map((key) => {
          const isKey = position.keyAttributes.includes(key);
          const value = career.attributes[key];
          return (
            <div key={key} title={descriptions[key]} className="cursor-help">
              <div className="flex justify-between text-xs">
                <span className={isKey ? 'font-medium text-gold-400' : 'text-ink-300'}>
                  <span aria-hidden>{ATTRIBUTE_ICONS[key]}</span> {labels[key]}
                </span>
                <span className="text-ink-400">{Math.round(value)}</span>
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${value}%`, backgroundColor: isKey ? '#e8b94a' : '#3d7a54' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
