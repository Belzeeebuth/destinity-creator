import { useNavigate } from 'react-router-dom';
import { LEGEND_CAREERS } from '../data/legends';
import { flagEmoji, getCountry } from '../data/countries';
import { getPosition } from '../data/positions';
import { useGameStore } from '../state/store';

export default function StoryModePage() {
  const navigate = useNavigate();
  const startCareer = useGameStore((s) => s.startCareer);
  const career = useGameStore((s) => s.career);

  function replay(legendId: string) {
    const legend = LEGEND_CAREERS.find((l) => l.id === legendId);
    if (!legend) return;
    if (career && !career.retired && !confirm('Une carrière est en cours. La remplacer par ce mode Histoire ?')) return;
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
      <h1 className="font-display text-3xl text-ink-100">📖 Mode Histoire</h1>
      <p className="mt-1 text-sm text-ink-300">
        Reprends les conditions de départ exactes d'une carrière légendaire (même pays, même poste, mêmes tirages)
        et tente de dépasser son score de légende.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4">
        {LEGEND_CAREERS.map((legend) => {
          const country = getCountry(legend.countryCode);
          const position = getPosition(legend.positionCode);
          return (
            <div key={legend.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{flagEmoji(legend.countryCode)}</span>
                <div>
                  <div className="font-display text-lg text-ink-100">{legend.name}</div>
                  <div className="text-xs text-ink-400">
                    {country.name} · {position.name}
                  </div>
                  <p className="mt-1 max-w-md text-sm text-ink-300">{legend.tagline}</p>
                  <p className="mt-1 text-xs text-gold-400">
                    À battre : {legend.finalStats.goals} buts · {legend.finalStats.caps} sélections ·{' '}
                    {legend.finalStats.trophies} trophées · score {legend.finalStats.legendScore}
                  </p>
                </div>
              </div>
              <button onClick={() => replay(legend.id)} className="btn-gold shrink-0 rounded-full px-5 py-2 text-sm">
                Rejouer cette carrière
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
