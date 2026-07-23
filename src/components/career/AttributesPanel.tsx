import type { PlayerState } from '../../engine/types';
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, ATTRIBUTE_LABELS_EN, ATTRIBUTE_ICONS, ATTRIBUTE_DESCRIPTIONS, ATTRIBUTE_DESCRIPTIONS_EN, getPosition } from '../../data/positions';
import { overallRating } from '../../engine/types';
import { useGameStore } from '../../state/store';
import { ui } from '../../i18n/ui';
import SegmentedBar from '../ui/SegmentedBar';
import { statTierColor } from '../ui/statColor';

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
        <span className="font-display tabular-nums" style={{ color: statTierColor(overall) }}>
          {overall.toFixed(1)} {ui(language, 'attributesOverall')}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-white/5 px-3">
        {visibleAttrs.map((key) => {
          const isKey = position.keyAttributes.includes(key);
          const value = career.attributes[key];
          const color = statTierColor(value);
          return (
            <div key={key} title={descriptions[key]} className="flex cursor-help items-center gap-2 py-1.5 text-xs">
              <span aria-hidden className="w-4 shrink-0 text-center text-[11px] opacity-70">
                {ATTRIBUTE_ICONS[key]}
              </span>
              <span className={`w-24 shrink-0 truncate sm:w-28 ${isKey ? 'font-semibold text-gold-400' : 'text-ink-300'}`}>
                {labels[key]}
              </span>
              <span className="w-7 shrink-0 text-right font-display tabular-nums" style={{ color }}>
                {Math.round(value)}
              </span>
              <span className="min-w-0 flex-1">
                <SegmentedBar value={value} segments={30} color={color} />
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-2" />
    </div>
  );
}
