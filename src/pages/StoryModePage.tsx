import { useNavigate } from 'react-router-dom';
import { LEGEND_CAREERS } from '../data/legends';
import { getCountry } from '../data/countries';
import { getPosition } from '../data/positions';
import { useGameStore } from '../state/store';
import { L } from '../i18n/language';
import { ui } from '../i18n/ui';
import CountryFlag from '../components/ui/CountryFlag';

export default function StoryModePage() {
  const navigate = useNavigate();
  const startCareer = useGameStore((s) => s.startCareer);
  const career = useGameStore((s) => s.career);
  const language = useGameStore((s) => s.language);

  function replay(legendId: string) {
    const legend = LEGEND_CAREERS.find((l) => l.id === legendId);
    if (!legend) return;
    if (career && !career.retired && !confirm(ui(language, 'storyModeConfirmReplace'))) return;
    startCareer({
      countryCode: legend.countryCode,
      positionCode: legend.positionCode,
      backgroundId: legend.backgroundId,
      lifestyleId: legend.lifestyleId,
      agentId: legend.agentId,
      seed: legend.seed,
      mode: 'story',
    });
    navigate('/carriere');
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl text-ink-100">{ui(language, 'storyModeTitle')}</h1>
      <p className="mt-1 text-sm text-ink-300">{ui(language, 'storyModeSubtitle')}</p>

      <div className="mt-6 grid grid-cols-1 gap-4">
        {LEGEND_CAREERS.map((legend) => {
          const country = getCountry(legend.countryCode);
          const position = getPosition(legend.positionCode);
          return (
            <div key={legend.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <CountryFlag code={legend.countryCode} size="lg" />
                <div>
                  <div className="font-display text-lg text-ink-100">{legend.name}</div>
                  <div className="text-xs text-ink-400">
                    {L(language, country.name, country.nameEn)} · {L(language, position.name, position.nameEn)}
                  </div>
                  <p className="mt-1 max-w-md text-sm text-ink-300">{L(language, legend.tagline, legend.taglineEn)}</p>
                  <p className="mt-1 text-xs text-gold-400">
                    {ui(language, 'toBeat')} {legend.finalStats.goals} {ui(language, 'legendGoals')} · {legend.finalStats.caps}{' '}
                    {ui(language, 'legendCaps')} · {legend.finalStats.trophies} {ui(language, 'legendTrophies')} ·{' '}
                    {ui(language, 'legendScoreShort')} {legend.finalStats.legendScore}
                  </p>
                </div>
              </div>
              <button onClick={() => replay(legend.id)} className="btn-gold shrink-0 rounded-full px-5 py-2 text-sm">
                {ui(language, 'replayThisCareer')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
