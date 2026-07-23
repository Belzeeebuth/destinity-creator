import type { PlayerState, PlayStyle } from '../../engine/types';
import { useGameStore } from '../../state/store';
import { ui, type UiKey } from '../../i18n/ui';

const PLAYSTYLES: { id: PlayStyle; emoji: string; labelKey: UiKey; descKey: UiKey }[] = [
  { id: 'offensif', emoji: '⚔️', labelKey: 'playstyleOffensifLabel', descKey: 'playstyleOffensifDesc' },
  { id: 'equilibre', emoji: '⚖️', labelKey: 'playstyleEquilibreLabel', descKey: 'playstyleEquilibreDesc' },
  { id: 'defensif', emoji: '🛡️', labelKey: 'playstyleDefensifLabel', descKey: 'playstyleDefensifDesc' },
];

export default function SeasonSimPanel({ career }: { career: PlayerState }) {
  const runSeasonSim = useGameStore((s) => s.runSeasonSim);
  const language = useGameStore((s) => s.language);

  return (
    <div className="panel-retro">
      <div className="panel-header-bar panel-header-bar--dark justify-center">
        <span>
          {ui(language, 'seasonStartTitle')} {career.season} {ui(language, 'seasonStartTitleSuffix')}
        </span>
      </div>
      <div className="flex flex-col items-center gap-4 p-10 text-center">
        <span className="text-4xl">⚽</span>
        <p className="max-w-md text-sm text-ink-300">
          {ui(language, 'seasonStartDescPrefix')} {career.club ? career.club.name : ui(language, 'freeAgentStatus')}.
        </p>
        <p className="text-xs uppercase tracking-wide text-ink-500">{ui(language, 'chooseTacticalApproach')}</p>
        <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
          {PLAYSTYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => runSeasonSim(style.id)}
              className="choice-option btn-outline flex flex-col items-center gap-1.5 rounded-sm px-4 py-3 text-center hover:border-gold-500/50 hover:text-gold-400"
            >
              <span className="text-2xl">{style.emoji}</span>
              <span className="font-display text-sm text-ink-100">{ui(language, style.labelKey)}</span>
              <span className="text-[11px] text-ink-400">{ui(language, style.descKey)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
