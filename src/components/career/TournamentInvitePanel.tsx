import { useState } from 'react';
import type { PlayerState } from '../../engine/types';
import { useGameStore } from '../../state/store';
import { getCountry } from '../../data/countries';
import { getAgent } from '../../data/agents';
import { L, type Language } from '../../i18n/language';
import { ui } from '../../i18n/ui';
import CountryFlag from '../ui/CountryFlag';

type Advisor = 'agent' | 'famille' | 'entraineur';

function buildAdvice(career: PlayerState, advisor: Advisor, language: Language): string {
  const agent = getAgent(career.agentId);
  if (advisor === 'agent') {
    if (agent.id === 'aucun') {
      return ui(language, 'adviceAgentNoRep');
    }
    return `${agent.emoji} ${L(language, agent.name, agent.nameEn)} : « ${ui(language, 'adviceAgentRep')} »`;
  }
  if (advisor === 'famille') {
    if (career.fitness < 55) {
      return ui(language, 'adviceFamilyTired');
    }
    return ui(language, 'adviceFamilyProud');
  }
  if (!career.club) {
    return ui(language, 'adviceCoachNoClub');
  }
  if (career.morale < 45) {
    return ui(language, 'adviceCoachLowMorale');
  }
  return ui(language, 'adviceCoachDefault');
}

export default function TournamentInvitePanel({ career }: { career: PlayerState }) {
  const acceptTournamentInvite = useGameStore((s) => s.acceptTournamentInvite);
  const declineTournamentInvite = useGameStore((s) => s.declineTournamentInvite);
  const language = useGameStore((s) => s.language);
  const [showAdviceMenu, setShowAdviceMenu] = useState(false);
  const [advice, setAdvice] = useState<{ from: Advisor; text: string } | null>(null);

  if (!career.pendingTournamentInvite) return null;
  const { tournamentName, kind } = career.pendingTournamentInvite;
  const country = getCountry(career.countryCode);
  const isWorldCup = kind === 'global';

  function ask(advisor: Advisor) {
    setAdvice({ from: advisor, text: buildAdvice(career, advisor, language) });
  }

  return (
    <div className="card animate-pop-in flex flex-col items-center gap-4 p-8 text-center">
      <span className="text-5xl">{isWorldCup ? '🌍' : '🏆'}</span>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gold-400">
        <CountryFlag code={career.countryCode} showCode={false} size="sm" />
        {ui(language, 'callUpHeader')} {L(language, country.name, country.nameEn)}
      </div>
      <h2 className="font-display text-2xl text-ink-100">{tournamentName}</h2>
      <p className="max-w-lg text-sm text-ink-300">
        {ui(language, 'callUpBodyPrefix')} <strong className="text-ink-100">{tournamentName}</strong> {ui(language, 'callUpBodySuffix')}
      </p>

      {advice && (
        <div className="animate-pop-in max-w-lg rounded-lg border border-gold-500/30 bg-pitch-800/60 p-3 text-sm text-ink-200">
          {advice.text}
        </div>
      )}

      {showAdviceMenu && !advice && (
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => ask('agent')} className="choice-option btn-outline rounded-full px-4 py-1.5 text-xs">
            {ui(language, 'askAgent')}
          </button>
          <button onClick={() => ask('famille')} className="choice-option btn-outline rounded-full px-4 py-1.5 text-xs">
            {ui(language, 'askFamily')}
          </button>
          <button onClick={() => ask('entraineur')} className="choice-option btn-outline rounded-full px-4 py-1.5 text-xs">
            {ui(language, 'askCoach')}
          </button>
        </div>
      )}

      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button onClick={acceptTournamentInvite} className="btn-gold rounded-full px-6 py-2.5 text-sm">
          {ui(language, 'acceptCallUp')}
        </button>
        <button onClick={declineTournamentInvite} className="btn-outline rounded-full px-6 py-2.5 text-sm">
          {ui(language, 'declineCallUp')}
        </button>
        {!showAdviceMenu && !advice && (
          <button
            onClick={() => setShowAdviceMenu(true)}
            className="btn-outline rounded-full px-6 py-2.5 text-sm hover:border-gold-500/50 hover:text-gold-400"
          >
            {ui(language, 'askAdvice')}
          </button>
        )}
      </div>
    </div>
  );
}
