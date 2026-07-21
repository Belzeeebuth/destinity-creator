import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlayerState } from '../../engine/types';
import { useGameStore, badgeNameById } from '../../state/store';
import { getCountry, TIER_INFO } from '../../data/countries';
import { getPosition } from '../../data/positions';
import { formatMoney } from '../../engine/util';
import { encodeShareCode } from '../../engine/challenges';
import CountryFlag from '../ui/CountryFlag';
import OverallEvolutionChart from './OverallEvolutionChart';

export default function CareerRecap({ career }: { career: PlayerState }) {
  const navigate = useNavigate();
  const careerEndSummary = useGameStore((s) => s.careerEndSummary);
  const finalizeCareerEnd = useGameStore((s) => s.finalizeCareerEnd);
  const abandonCareer = useGameStore((s) => s.abandonCareer);
  const [showHistory, setShowHistory] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [challengeCode, setChallengeCode] = useState<string | null>(null);

  useEffect(() => {
    if (!careerEndSummary) finalizeCareerEnd();
  }, [careerEndSummary, finalizeCareerEnd]);

  const country = getCountry(career.countryCode);
  const position = getPosition(career.positionCode);
  const isGK = position.code === 'GK';

  function handleShare() {
    const text = `J'ai écrit ma légende sur Destiny Eleven : ${career.firstName} ${career.lastName} (${country.name}, ${position.name}) — ${career.careerGoals} buts, ${career.caps} sélections, retraite à ${career.age} ans. Score de légende : ${careerEndSummary?.legendScore ?? '?'}.`;
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
        <h1 className="mt-2 font-display text-3xl text-ink-100">Fin de carrière</h1>
        <p className="mt-1 text-ink-300">{career.retirementReason}</p>
        <p className="mt-3 font-display text-xl text-gold-400">
          {career.firstName} {career.lastName}
        </p>
        <p className="flex items-center justify-center gap-2 text-sm text-ink-400">
          <CountryFlag code={career.countryCode} size="sm" /> {country.name} · {position.emoji} {position.name} · {TIER_INFO[country.tier].label}
        </p>

        {careerEndSummary && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
            <Badge label="Score de légende" value={careerEndSummary.legendScore} />
            <Badge label="Jetons gagnés" value={`+${careerEndSummary.tokensEarned}`} />
            <Badge label="Nouveaux badges" value={careerEndSummary.newBadgeIds.length} />
          </div>
        )}
      </div>

      <div className="card grid grid-cols-2 gap-3 p-5 text-center sm:grid-cols-4">
        {isGK ? (
          <>
            <Stat label="Clean sheets" value={career.careerCleanSheets} />
            <Stat label="Arrêts" value={career.careerSaves} />
          </>
        ) : (
          <>
            <Stat label="Buts" value={career.careerGoals} />
            <Stat label="Passes D." value={career.careerAssists} />
          </>
        )}
        <Stat label="Matchs" value={career.careerAppearances} />
        <Stat label="Sélections" value={career.caps} />
        <Stat label="Trophées" value={career.trophies.length} />
        <Stat label="Blessures" value={career.careerInjuries} />
        <Stat label="Cartons 🟨/🟥" value={`${career.careerYellowCards}/${career.careerRedCards}`} />
        <Stat label="Nominations Meilleur Joueur" value={career.ballonsAttempts} />
        <Stat label="Retraite à" value={`${career.age} ans`} />
        <Stat label="Valeur finale" value={formatMoney(career.marketValue)} />
      </div>

      {career.history.length >= 2 && <OverallEvolutionChart history={career.history} />}

      {career.majorAwards.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display text-lg text-ink-100">🌟 Distinctions individuelles</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-300">
            {career.majorAwards.map((a, i) => (
              <li key={i}>🏅 {a}</li>
            ))}
          </ul>
        </div>
      )}

      {careerEndSummary && careerEndSummary.newBadgeIds.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display text-lg text-ink-100">Nouveaux badges débloqués</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {careerEndSummary.newBadgeIds.map((id) => (
              <span key={id} className="rounded-full bg-gold-500/15 px-3 py-1 text-sm text-gold-400">
                🏅 {badgeNameById(id)}
              </span>
            ))}
          </div>
        </div>
      )}

      {career.trophies.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display text-lg text-ink-100">Palmarès collectif</h2>
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
          {showHistory ? 'Masquer' : '📅 Voir la carrière saison par saison'}
        </button>
        {showHistory && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-ink-500">
                <tr>
                  <th className="pb-2">Saison</th>
                  <th className="pb-2">Âge</th>
                  <th className="pb-2">Club</th>
                  <th className="pb-2">Matchs</th>
                  {isGK ? (
                    <>
                      <th className="pb-2">Clean sheets</th>
                      <th className="pb-2">Arrêts</th>
                    </>
                  ) : (
                    <>
                      <th className="pb-2">Buts</th>
                      <th className="pb-2">Passes</th>
                    </>
                  )}
                  <th className="pb-2">Note</th>
                  <th className="pb-2">Sélections</th>
                </tr>
              </thead>
              <tbody className="text-ink-300">
                {career.history.map((h) => (
                  <tr key={h.season} className="border-t border-white/5">
                    <td className="py-1.5">{h.season}</td>
                    <td className="py-1.5">{h.age}</td>
                    <td className="py-1.5">{h.clubName}</td>
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
            {shareCopied ? 'Copié !' : '📤 Partager'}
          </button>
          <button onClick={handleChallengeFriend} className="btn-outline flex-1 rounded-full py-2.5 text-sm">
            🆚 Défier un ami
          </button>
        </div>
        {challengeCode && (
          <div className="rounded-lg bg-white/5 p-3 text-xs text-ink-300">
            <p className="mb-1 text-ink-500">
              Transmets ce code à un ami : il commencera avec exactement les mêmes conditions de départ et les mêmes
              tirages aléatoires que toi, à lui de faire mieux !
            </p>
            <code className="block break-all rounded bg-black/30 p-2 text-gold-400">{challengeCode}</code>
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={startNew} className="btn-gold flex-1 rounded-full py-2.5 text-sm">
            Rejouer une carrière
          </button>
          <button onClick={goHome} className="btn-outline flex-1 rounded-full py-2.5 text-sm">
            Retour à l'accueil
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
