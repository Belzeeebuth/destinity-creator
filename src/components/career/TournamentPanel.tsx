import type { PlayerState, TournamentState, TournamentMatchResult, TournamentTeamStanding } from '../../engine/types';
import { useGameStore } from '../../state/store';
import { getCountry } from '../../data/countries';
import { goldenBootRank, playmakerRank, bestPlayerRank, averagePlayerRating } from '../../engine/tournament';
import { L, type Language } from '../../i18n/language';
import { ui, type UiKey } from '../../i18n/ui';
import CountryFlag from '../ui/CountryFlag';

const KNOCKOUT_LABELS: { stage: TournamentState['stage']; labelKey: UiKey }[] = [
  { stage: 'groupes', labelKey: 'stageGroups' },
  { stage: 'huitiemes', labelKey: 'stageR16' },
  { stage: 'quarts', labelKey: 'stageQuarters' },
  { stage: 'demies', labelKey: 'stageSemis' },
  { stage: 'finale', labelKey: 'stageFinal' },
];

export default function TournamentPanel({ career }: { career: PlayerState }) {
  const t = career.activeTournament;
  const playTournamentStep = useGameStore((s) => s.playTournamentStep);
  const continueAfterTournament = useGameStore((s) => s.continueAfterTournament);
  const acknowledgeTournamentMatch = useGameStore((s) => s.acknowledgeTournamentMatch);
  const lastTournamentMatch = useGameStore((s) => s.lastTournamentMatch);
  const language = useGameStore((s) => s.language);

  if (!t) return null;

  if (lastTournamentMatch) {
    return <MatchResultCard result={lastTournamentMatch} onContinue={acknowledgeTournamentMatch} language={language} />;
  }

  if (t.stage === 'termine') {
    return <TournamentRecap career={career} t={t} onContinue={continueAfterTournament} language={language} />;
  }

  const nextOpponentCode = t.stage === 'groupes' ? t.groupOpponents[t.groupMatchIndex] : null;
  const nextOpponent = nextOpponentCode ? getCountry(nextOpponentCode) : null;
  const inKnockout = t.stage !== 'groupes';

  return (
    <div className="card animate-pop-in flex flex-col items-center gap-5 p-8 text-center">
      <StageStepper current={t.stage} language={language} />
      <h2 className="font-display text-2xl text-ink-100">{t.tournamentName}</h2>

      {inKnockout ? (
        <div className="animate-pop-in flex flex-col items-center gap-1.5 rounded-2xl border border-gold-500/40 bg-gold-500/10 px-6 py-4">
          <span className="text-3xl" aria-hidden>
            🏟️
          </span>
          <p className="text-[11px] uppercase tracking-wide text-gold-400">{ui(language, 'knockoutPhaseLabel')}</p>
          <p className="font-display text-xl text-ink-100">{t.finalStageLabel}</p>
          <p className="text-xs text-ink-400">{ui(language, 'knockoutSub')}</p>
        </div>
      ) : (
        <p className="text-xs uppercase tracking-wide text-gold-400">{t.finalStageLabel}</p>
      )}

      {t.stage === 'groupes' && t.groupTable.length > 0 && <GroupTable table={t.groupTable} language={language} />}

      {inKnockout && t.groupTable.length > 0 && (
        <details className="w-full text-xs text-ink-400">
          <summary className="cursor-pointer select-none text-ink-500 transition hover:text-ink-300">
            {ui(language, 'reviewGroupStanding')}
          </summary>
          <div className="mt-2">
            <GroupTable table={t.groupTable} language={language} />
          </div>
        </details>
      )}

      {nextOpponent && (
        <div className="flex items-center gap-2 text-sm text-ink-300">
          {ui(language, 'nextOpponentLabel')} <CountryFlag code={nextOpponent.code} size="sm" /> {L(language, nextOpponent.name, nextOpponent.nameEn)}
        </div>
      )}

      {t.matches.length > 0 && <MatchLog matches={t.matches} />}

      <button onClick={playTournamentStep} className="btn-gold rounded-full px-8 py-2.5 text-sm">
        {ui(language, 'playMatch')} {inKnockout ? t.finalStageLabel.toLowerCase() : ui(language, 'playMatchGeneric')}
      </button>
    </div>
  );
}

function StageStepper({ current, language }: { current: TournamentState['stage']; language: Language }) {
  const currentIndex = KNOCKOUT_LABELS.findIndex((s) => s.stage === current);
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
      {KNOCKOUT_LABELS.map((s, i) => (
        <span
          key={s.stage}
          className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-wide ${
            i < currentIndex
              ? 'bg-emerald-500/15 text-emerald-400'
              : i === currentIndex
                ? 'bg-gold-500/20 text-gold-400'
                : 'bg-white/5 text-ink-500'
          }`}
        >
          {ui(language, s.labelKey)}
        </span>
      ))}
    </div>
  );
}

function GroupTable({ table, language }: { table: TournamentTeamStanding[]; language: Language }) {
  const ranked = [...table].sort(
    (a, b) => b.points - a.points || b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor,
  );
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-xs">
        <thead className="text-ink-500">
          <tr>
            <th className="pb-1.5">{ui(language, 'tableTeam')}</th>
            <th className="pb-1.5">{ui(language, 'tableP')}</th>
            <th className="pb-1.5">{ui(language, 'tableW')}</th>
            <th className="pb-1.5">{ui(language, 'tableD')}</th>
            <th className="pb-1.5">{ui(language, 'tableL')}</th>
            <th className="pb-1.5">{ui(language, 'tableDiff')}</th>
            <th className="pb-1.5">{ui(language, 'tablePts')}</th>
          </tr>
        </thead>
        <tbody className="text-ink-300">
          {ranked.map((s) => (
            <tr key={s.countryCode} className={s.isPlayerTeam ? 'font-semibold text-gold-400' : ''}>
              <td className="flex items-center gap-1.5 py-1">
                <CountryFlag code={s.countryCode} size="sm" showCode={false} /> {s.countryName}
              </td>
              <td className="py-1">{s.played}</td>
              <td className="py-1">{s.won}</td>
              <td className="py-1">{s.drawn}</td>
              <td className="py-1">{s.lost}</td>
              <td className="py-1">
                {s.goalsFor - s.goalsAgainst > 0 ? '+' : ''}
                {s.goalsFor - s.goalsAgainst}
              </td>
              <td className="py-1">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchLog({ matches }: { matches: TournamentMatchResult[] }) {
  return (
    <div className="flex w-full flex-col gap-1.5 text-left text-xs text-ink-400">
      {matches.map((m, i) => (
        <div key={i} className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-1.5">
          <span className="w-24 shrink-0 text-ink-500">{m.roundLabel}</span>
          <CountryFlag code={m.opponentCountryCode} size="sm" showCode={false} />
          <span className="flex-1">{m.narrative}</span>
        </div>
      ))}
    </div>
  );
}

function MatchResultCard({ result, onContinue, language }: { result: TournamentMatchResult; onContinue: () => void; language: Language }) {
  const won = result.wonOnPenalties !== undefined ? result.wonOnPenalties : result.scoreFor > result.scoreAgainst;
  const draw = result.wonOnPenalties === undefined && result.scoreFor === result.scoreAgainst;
  const color = won ? 'text-emerald-400' : draw ? 'text-gold-400' : 'text-red-400';
  return (
    <div className="card animate-pop-in flex flex-col items-center gap-4 p-8 text-center">
      <span className="text-xs uppercase tracking-wide text-gold-400">{result.roundLabel}</span>
      <div className="flex items-center gap-3">
        <CountryFlag code={result.opponentCountryCode} size="lg" showCode={false} />
        <span className={`font-display text-3xl ${color}`}>
          {result.scoreFor} - {result.scoreAgainst}
        </span>
      </div>

      {result.timeline.length > 0 && (
        <div className="flex w-full max-w-md flex-col gap-1.5 text-left">
          {result.timeline.map((ev, i) => (
            <div
              key={i}
              className={`animate-fade-in-up flex items-start gap-3 rounded-md px-3 py-1.5 text-xs ${
                ev.isPlayerInvolved ? 'bg-gold-500/10 font-semibold text-gold-400' : 'bg-white/5 text-ink-300'
              }`}
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <span className="w-20 shrink-0 text-ink-500">{ev.minuteLabel}</span>
              <span className="flex-1">{ev.text}</span>
            </div>
          ))}
        </div>
      )}

      <p className="max-w-md text-sm text-ink-300">{result.narrative}</p>
      <div className="flex items-center gap-2 text-xs text-ink-400">
        <span className="rounded-full bg-white/5 px-3 py-1">
          {ui(language, 'ratingLabel')} {result.playerRating.toFixed(1)}/10
        </span>
        {result.playerGoals > 0 && <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-400">⚽ {result.playerGoals}</span>}
        {result.playerAssists > 0 && <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sky-400">🎯 {result.playerAssists}</span>}
      </div>
      <button onClick={onContinue} className="btn-gold mt-2 rounded-full px-6 py-2 text-sm">
        {ui(language, 'continueButton')}
      </button>
    </div>
  );
}

interface RankingRow {
  name: string;
  countryCode: string;
  countryName: string;
  value: number;
  isPlayer: boolean;
}

function buildRanking(career: PlayerState, t: TournamentState, statKey: 'goals' | 'assists' | 'rating', language: Language): RankingRow[] {
  const playerValue = statKey === 'goals' ? t.playerGoals : statKey === 'assists' ? t.playerAssists : averagePlayerRating(t);
  const country = getCountry(career.countryCode);
  const rows: RankingRow[] = [
    {
      name: `${career.firstName} ${career.lastName}`,
      countryCode: country.code,
      countryName: L(language, country.name, country.nameEn),
      value: playerValue,
      isPlayer: true,
    },
    ...t.rivals.map((r) => ({
      name: r.name,
      countryCode: r.countryCode,
      countryName: r.countryName,
      value: statKey === 'goals' ? r.goals : statKey === 'assists' ? r.assists : r.avgRating,
      isPlayer: false,
    })),
  ];
  return rows.sort((a, b) => b.value - a.value);
}

function RankingTable({ title, icon, rows, rank, decimals = 0 }: { title: string; icon: string; rows: RankingRow[]; rank: number; decimals?: number }) {
  const top = rows.slice(0, 5);
  const playerInTop = top.some((r) => r.isPlayer);
  const playerRow = rows.find((r) => r.isPlayer);
  return (
    <div className="card p-4 text-left">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink-100">
          {icon} {title}
        </span>
        <span className="rounded-full bg-gold-500/15 px-2.5 py-0.5 text-xs font-bold text-gold-400">#{rank}</span>
      </div>
      <div className="flex flex-col gap-1 text-xs">
        {top.map((r, i) => (
          <div
            key={i}
            className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${r.isPlayer ? 'bg-gold-500/10 font-semibold text-gold-400' : 'text-ink-300'}`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <CountryFlag code={r.countryCode} size="sm" showCode={false} /> {r.name}
            </span>
            <span>{r.value.toFixed(decimals)}</span>
          </div>
        ))}
        {!playerInTop && playerRow && (
          <div className="mt-1 flex items-center justify-between gap-2 rounded bg-gold-500/10 px-2 py-1 font-semibold text-gold-400">
            <span className="flex items-center gap-1.5 truncate">
              <CountryFlag code={playerRow.countryCode} size="sm" showCode={false} /> {playerRow.name}
            </span>
            <span>{playerRow.value.toFixed(decimals)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TournamentRecap({ career, t, onContinue, language }: { career: PlayerState; t: TournamentState; onContinue: () => void; language: Language }) {
  const goalsRanking = buildRanking(career, t, 'goals', language);
  const assistsRanking = buildRanking(career, t, 'assists', language);
  const ratingRanking = buildRanking(career, t, 'rating', language);

  return (
    <div className="animate-pop-in flex flex-col gap-5">
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <span className="text-5xl">{t.champion ? '🏆' : '👋'}</span>
        <h2 className="font-display text-2xl text-ink-100">{t.finalStageLabel}</h2>
        <p className="text-sm text-ink-300">
          {t.tournamentName} — {t.playerGoals} {ui(language, t.playerGoals > 1 ? 'tournamentRecapGoals' : 'tournamentRecapGoal')},{' '}
          {t.playerAssists} {ui(language, t.playerAssists > 1 ? 'tournamentRecapAssists' : 'tournamentRecapAssist')}{' '}
          {language === 'en' ? 'in' : 'en'} {t.matches.length} {ui(language, t.matches.length > 1 ? 'tournamentRecapMatches' : 'tournamentRecapMatch')},{' '}
          {ui(language, 'tournamentRecapAvgRating')} {averagePlayerRating(t).toFixed(1)}/10.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <RankingTable title={ui(language, 'topScorerTitle')} icon="⚽" rows={goalsRanking} rank={goldenBootRank(t)} />
        <RankingTable title={ui(language, 'topPlaymakerTitle')} icon="🎯" rows={assistsRanking} rank={playmakerRank(t)} />
        <RankingTable title={ui(language, 'bestPlayerTitle')} icon="🌟" rows={ratingRanking} rank={bestPlayerRank(t)} decimals={1} />
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink-100">{ui(language, 'finalGroupStanding')}</h3>
        <GroupTable table={t.groupTable} language={language} />
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink-100">{ui(language, 'tournamentJourney')}</h3>
        <MatchLog matches={t.matches} />
      </div>

      <button onClick={onContinue} className="btn-gold self-center rounded-full px-8 py-2.5 text-sm">
        {ui(language, 'continueToClubSeason')}
      </button>
    </div>
  );
}
