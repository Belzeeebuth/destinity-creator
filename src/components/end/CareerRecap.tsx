import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlayerState } from '../../engine/types';
import { useGameStore, badgeNameById } from '../../state/store';
import { getCountry, TIER_INFO } from '../../data/countries';
import { getPosition } from '../../data/positions';
import { formatMoney } from '../../engine/util';
import { encodeShareCode } from '../../engine/challenges';
import { L } from '../../i18n/language';
import { ui } from '../../i18n/ui';
import CountryFlag from '../ui/CountryFlag';
import OverallEvolutionChart from './OverallEvolutionChart';

export default function CareerRecap({ career }: { career: PlayerState }) {
  const navigate = useNavigate();
  const careerEndSummary = useGameStore((s) => s.careerEndSummary);
  const finalizeCareerEnd = useGameStore((s) => s.finalizeCareerEnd);
  const abandonCareer = useGameStore((s) => s.abandonCareer);
  const language = useGameStore((s) => s.language);
  const [showHistory, setShowHistory] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [challengeCode, setChallengeCode] = useState<string | null>(null);

  useEffect(() => {
    if (!careerEndSummary) finalizeCareerEnd();
  }, [careerEndSummary, finalizeCareerEnd]);

  const country = getCountry(career.countryCode);
  const position = getPosition(career.positionCode);
  const countryName = L(language, country.name, country.nameEn);
  const positionName = L(language, position.name, position.nameEn);
  const isGK = position.code === 'GK';

  function handleShare() {
    const text = `${ui(language, 'shareText')} ${career.firstName} ${career.lastName} (${countryName}, ${positionName}) ${ui(language, 'shareTextMiddle')} ${career.careerGoals} ${ui(language, 'shareTextGoals')}, ${career.caps} ${ui(language, 'shareTextCaps')} ${career.age} ${ui(language, 'shareTextAge')} ${careerEndSummary?.legendScore ?? '?'}.`;
    navigator.clipboard?.writeText(text).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    });
  }

  function handleChallengeFriend() {
    const code = encodeShareCode({
      countryCode: career.countryCode,
      positionCode: career.positionCode,
      backgroundId: career.backgroundId,
      lifestyleId: career.lifestyleId,
      agentId: career.agentId,
      seed: career.seed,
    });
    setChallengeCode(code);
  }

  function startNew() {
    abandonCareer();
    navigate('/creation');
  }

  function goHome() {
    abandonCareer();
    navigate('/');
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="card p-6 text-center">
        <span className="text-4xl">🏆</span>
        <h1 className="mt-2 font-display text-3xl text-ink-100">{ui(language, 'careerOverTitle')}</h1>
        <p className="mt-1 text-ink-300">{career.retirementReason}</p>
        <p className="mt-3 font-display text-xl text-gold-400">
          {career.firstName} {career.lastName}
        </p>
        <p className="flex items-center justify-center gap-2 text-sm text-ink-400">
          <CountryFlag code={career.countryCode} size="sm" /> {countryName} · {position.emoji} {positionName} ·{' '}
          {L(language, TIER_INFO[country.tier].label, TIER_INFO[country.tier].labelEn)}
        </p>

        {careerEndSummary && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
            <Badge label={ui(language, 'legendScoreLabel')} value={careerEndSummary.legendScore} />
            <Badge label={ui(language, 'tokensEarnedLabel')} value={`+${careerEndSummary.tokensEarned}`} />
            <Badge label={ui(language, 'newBadgesLabel')} value={careerEndSummary.newBadgeIds.length} />
          </div>
        )}
      </div>

      <div className="card grid grid-cols-2 gap-3 p-5 text-center sm:grid-cols-4">
        {isGK ? (
          <>
            <Stat label={ui(language, 'statCleanSheets')} value={career.careerCleanSheets} />
            <Stat label={ui(language, 'statSaves')} value={career.careerSaves} />
          </>
        ) : (
          <>
            <Stat label={ui(language, 'statGoals')} value={career.careerGoals} />
            <Stat label={ui(language, 'statAssists')} value={career.careerAssists} />
          </>
        )}
        <Stat label={ui(language, 'statMatches')} value={career.careerAppearances} />
        <Stat label={ui(language, 'statusCaps')} value={career.caps} />
        <Stat label={ui(language, 'statTrophies')} value={career.trophies.length} />
        <Stat label={ui(language, 'statInjuries')} value={career.careerInjuries} />
        <Stat label={ui(language, 'statCards')} value={`${career.careerYellowCards}/${career.careerRedCards}`} />
        <Stat label={ui(language, 'statBallonNominations')} value={career.ballonsAttempts} />
        <Stat label={ui(language, 'statRetiredAt')} value={`${career.age} ${ui(language, 'homeYearsOld')}`} />
        <Stat label={ui(language, 'statFinalValue')} value={formatMoney(career.marketValue)} />
      </div>

      {career.history.length >= 2 && <OverallEvolutionChart history={career.history} />}

      {career.majorAwards.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display text-lg text-ink-100">{ui(language, 'individualAwardsTitle')}</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-300">
            {career.majorAwards.map((a, i) => (
              <li key={i}>🏅 {a}</li>
            ))}
          </ul>
        </div>
      )}

      {careerEndSummary && careerEndSummary.newBadgeIds.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display text-lg text-ink-100">{ui(language, 'newBadgesUnlockedTitle')}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {careerEndSummary.newBadgeIds.map((id) => (
              <span key={id} className="rounded-full bg-gold-500/15 px-3 py-1 text-sm text-gold-400">
                🏅 {badgeNameById(id, language)}
              </span>
            ))}
          </div>
        </div>
      )}

      {career.trophies.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display text-lg text-ink-100">{ui(language, 'trophiesTitle')}</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-300">
            {career.trophies.map((t, i) => (
              <li key={i}>🏆 {t}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-5">
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="btn-outline w-full rounded-full py-2 text-sm"
        >
          {showHistory ? ui(language, 'hideButton') : ui(language, 'viewSeasonBySeasonButton')}
        </button>
        {showHistory && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-ink-500">
                <tr>
                  <th className="pb-2">{ui(language, 'homeSeasonAge')}</th>
                  <th className="pb-2">{ui(language, 'tableAge')}</th>
                  <th className="pb-2">{ui(language, 'tableClub')}</th>
                  <th className="pb-2">{ui(language, 'tableDivision')}</th>
                  <th className="pb-2">{ui(language, 'statMatches')}</th>
                  {isGK ? (
                    <>
                      <th className="pb-2">{ui(language, 'statCleanSheets')}</th>
                      <th className="pb-2">{ui(language, 'statSaves')}</th>
                    </>
                  ) : (
                    <>
                      <th className="pb-2">{ui(language, 'statGoals')}</th>
                      <th className="pb-2">{ui(language, 'tablePasses')}</th>
                    </>
                  )}
                  <th className="pb-2">{ui(language, 'tableRating')}</th>
                  <th className="pb-2">{ui(language, 'tableCaps')}</th>
                </tr>
              </thead>
              <tbody className="text-ink-300">
                {career.history.map((h) => (
                  <tr key={h.season} className="border-t border-white/5">
                    <td className="py-1.5">{h.season}</td>
                    <td className="py-1.5">{h.age}</td>
                    <td className="py-1.5">{h.clubName}</td>
                    <td className="py-1.5 text-ink-500">{h.divisionName}</td>
                    <td className="py-1.5">{h.appearances}</td>
                    {isGK ? (
                      <>
                        <td className="py-1.5">{h.cleanSheets}</td>
                        <td className="py-1.5">{h.saves}</td>
                      </>
                    ) : (
                      <>
                        <td className="py-1.5">{h.goals}</td>
                        <td className="py-1.5">{h.assists}</td>
                      </>
                    )}
                    <td className="py-1.5">{h.avgRating.toFixed(1)}</td>
                    <td className="py-1.5">{h.caps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={handleShare} className="btn-outline flex-1 rounded-full py-2.5 text-sm">
            {shareCopied ? ui(language, 'copiedLabel') : ui(language, 'shareButton')}
          </button>
          <button onClick={handleChallengeFriend} className="btn-outline flex-1 rounded-full py-2.5 text-sm">
            {ui(language, 'challengeFriendButton')}
          </button>
        </div>
        {challengeCode && (
          <div className="rounded-lg bg-white/5 p-3 text-xs text-ink-300">
            <p className="mb-1 text-ink-500">{ui(language, 'challengeCodeExplainer')}</p>
            <code className="block break-all rounded bg-black/30 p-2 text-gold-400">{challengeCode}</code>
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={startNew} className="btn-gold flex-1 rounded-full py-2.5 text-sm">
            {ui(language, 'replayCareerButton')}
          </button>
          <button onClick={goHome} className="btn-outline flex-1 rounded-full py-2.5 text-sm">
            {ui(language, 'backToHomeButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-display text-xl text-ink-100">{value}</div>
      <div className="text-[11px] text-ink-500">{label}</div>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 text-center">
      <div className="font-display text-2xl text-gold-400">{value}</div>
      <div className="text-[11px] text-ink-400">{label}</div>
    </div>
  );
}
