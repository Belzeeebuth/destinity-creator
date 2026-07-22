import { useState } from 'react';
import { getPosition } from '../data/positions';
import { useGameStore } from '../state/store';
import { L } from '../i18n/language';
import { ui } from '../i18n/ui';
import CountryFlag from '../components/ui/CountryFlag';
import OverallEvolutionChart from '../components/end/OverallEvolutionChart';

export default function PantheonPage() {
  const pantheon = useGameStore((s) => s.meta.pantheon);
  const language = useGameStore((s) => s.language);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl text-ink-100">{ui(language, 'pantheonTitle')}</h1>
      <p className="mt-1 text-sm text-ink-300">{ui(language, 'pantheonSubtitle')}</p>

      {pantheon.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-ink-400">
          <p>{ui(language, 'pantheonEmptyTitle')}</p>
          <p className="mt-1 text-sm">{ui(language, 'pantheonEmptySub')}</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {pantheon.map((entry, i) => {
            const position = getPosition(entry.positionCode as never);
            const isGK = position?.code === 'GK';
            const open = openId === entry.id;
            const positionName = position ? L(language, position.name, position.nameEn) : entry.positionCode;
            return (
              <div key={entry.id} className="card overflow-hidden">
                <button
                  onClick={() => setOpenId(open ? null : entry.id)}
                  className="flex w-full items-center gap-4 p-4 text-left"
                >
                  <span className="w-8 text-center font-display text-xl text-gold-400">#{i + 1}</span>
                  <CountryFlag code={entry.countryCode} />
                  <div className="flex-1">
                    <div className="font-display text-lg text-ink-100">{entry.playerName}</div>
                    <div className="text-xs text-ink-400">
                      {entry.countryName} · {positionName}
                    </div>
                    <div className="mt-0.5 text-sm text-ink-300">{entry.summary}</div>
                  </div>
                  <span className="rounded-full bg-gold-500/15 px-3 py-1 text-sm font-semibold text-gold-400">
                    {entry.legendScore}
                  </span>
                  <span className="text-ink-500">{open ? '▲' : '▼'}</span>
                </button>

                {open && (
                  <div className="border-t border-white/10 p-4">
                    {entry.majorAwards.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1 text-xs uppercase tracking-wide text-ink-500">{ui(language, 'individualAwardsTitle').replace('🌟 ', '')}</p>
                        <ul className="flex flex-col gap-1 text-sm text-ink-300">
                          {entry.majorAwards.map((a, idx) => (
                            <li key={idx}>🏅 {a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {entry.trophies.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1 text-xs uppercase tracking-wide text-ink-500">{ui(language, 'trophiesTitle')}</p>
                        <ul className="flex flex-col gap-1 text-sm text-ink-300">
                          {entry.trophies.map((t, idx) => (
                            <li key={idx}>🏆 {t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {entry.history.length > 1 && (
                      <div className="mb-3">
                        <OverallEvolutionChart history={entry.history} />
                      </div>
                    )}
                    {entry.history.length > 0 && (
                      <div className="overflow-x-auto">
                        <p className="mb-1 text-xs uppercase tracking-wide text-ink-500">{ui(language, 'seasonBySeasonLabel')}</p>
                        <table className="w-full min-w-[520px] text-left text-sm">
                          <thead className="text-ink-500">
                            <tr>
                              <th className="pb-1.5">{ui(language, 'homeSeasonAge')}</th>
                              <th className="pb-1.5">{ui(language, 'tableAge')}</th>
                              <th className="pb-1.5">{ui(language, 'tableClub')}</th>
                              <th className="pb-1.5">{ui(language, 'tableDivision')}</th>
                              <th className="pb-1.5">{ui(language, 'statMatches')}</th>
                              {isGK ? (
                                <>
                                  <th className="pb-1.5">{ui(language, 'statCleanSheets')}</th>
                                  <th className="pb-1.5">{ui(language, 'statSaves')}</th>
                                </>
                              ) : (
                                <>
                                  <th className="pb-1.5">{ui(language, 'statGoals')}</th>
                                  <th className="pb-1.5">{ui(language, 'tablePasses')}</th>
                                </>
                              )}
                              <th className="pb-1.5">{ui(language, 'tableRating')}</th>
                            </tr>
                          </thead>
                          <tbody className="text-ink-300">
                            {entry.history.map((h) => (
                              <tr key={h.season} className="border-t border-white/5">
                                <td className="py-1">{h.season}</td>
                                <td className="py-1">{h.age}</td>
                                <td className="py-1">{h.clubName}</td>
                                <td className="py-1 text-ink-500">{h.divisionName}</td>
                                <td className="py-1">{h.appearances}</td>
                                {isGK ? (
                                  <>
                                    <td className="py-1">{h.cleanSheets}</td>
                                    <td className="py-1">{h.saves}</td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-1">{h.goals}</td>
                                    <td className="py-1">{h.assists}</td>
                                  </>
                                )}
                                <td className="py-1">{h.avgRating.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
