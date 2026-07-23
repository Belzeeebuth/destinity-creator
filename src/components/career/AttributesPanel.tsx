import type { PlayerState } from '../../engine/types';
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, ATTRIBUTE_LABELS_EN, ATTRIBUTE_ICONS, ATTRIBUTE_DESCRIPTIONS, ATTRIBUTE_DESCRIPTIONS_EN, getPosition } from '../../data/positions';
import { overallRating } from '../../engine/types';
import { useGameStore } from '../../state/store';
import { ui } from '../../i18n/ui';
import SegmentedBar from '../ui/SegmentedBar';

export default function AttributesPanel({ career }: { career: PlayerState }) {
  const language = useGameStore((s) => s.language);
  const position = getPosition(career.positionCode);
  const overall = overallRating(career.attributes, position.weights);
  const visibleAttrs = ATTRIBUTE_KEYS.filter((k) => k !== 'reflexes' || position.code === 'GK');
  const labels = language === 'en' ? ATTRIBUTE_LABELS_EN : ATTRIBUTE_LABELS;
  const descriptions = language === 'en' ? ATTRIBUTE_DESCRIPTIONS_EN : ATTRIBUTE_DESCRIPTIONS;

  return (
    <div className="panel-retro">
      <div className="panel-header-bar">
        <span>{ui(language, 'attributesTitle')}</span>
        <span className="rounded-sm bg-black/25 px-2 py-0.5 font-display text-sm tabular-nums">
          {overall.toFixed(1)} {ui(language, 'attributesOverall')}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 p-4 sm:grid-cols-2">
        {visibleAttrs.map((key) => {
          const isKey = position.keyAttributes.includes(key);
          const value = career.attributes[key];
          return (
            <div key={key} title={descriptions[key]} className="cursor-help">
              <div className="flex justify-between text-xs">
                <span className={isKey ? 'font-semibold text-gold-400' : 'text-ink-300'}>
                  <span aria-hidden>{ATTRIBUTE_ICONS[key]}</span> {labels[key]}
                </span>
                <span className="font-display tabular-nums text-ink-300">{Math.round(value)}</span>
              </div>
              <div className="mt-1">
                <SegmentedBar value={value} color={isKey ? '#eabd52' : '#5c9d75'} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
