import { useState } from 'react';
import type { PlayerState } from '../../engine/types';
import { useGameStore } from '../../state/store';
import { getCountry } from '../../data/countries';
import { getAgent } from '../../data/agents';
import { GLOBAL_TOURNAMENT_NAME } from '../../data/awards';
import CountryFlag from '../ui/CountryFlag';

type Advisor = 'agent' | 'famille' | 'entraineur';

function buildAdvice(career: PlayerState, advisor: Advisor): string {
  const agent = getAgent(career.agentId);
  if (advisor === 'agent') {
    if (agent.id === 'aucun') {
      return "Tu gères seul ta carrière... mais tu sais très bien qu'une grande vitrine internationale peut faire décoller ta valeur marchande si tu brilles là-bas.";
    }
    return `${agent.emoji} ${agent.name} : « Une vitrine internationale pareille, ça ne se refuse pas ! Ta valeur marchande peut s'envoler si tu performes. »`;
  }
  if (advisor === 'famille') {
    if (career.fitness < 55) {
      return "👪 Ta famille s'inquiète : « Tu rentres fatigué ces derniers temps... Un tournoi en plus, physiquement, ce n'est pas rien. À toi de voir si ton corps peut suivre. »";
    }
    return "👪 Ta famille : « On est fiers que tu sois appelé ! Quoi que tu décides, profite de ce moment : ça ne se représente pas tous les jours. »";
  }
  if (!career.club) {
    return "🧑‍🏫 Sans club actuellement, rien ne t'empêche de foncer : ce tournoi est une occasion en or de te montrer aux yeux de tous les recruteurs.";
  }
  if (career.morale < 45) {
    return "🧑‍🏫 Ton entraîneur en club : « Avec ton moral en ce moment, la pression d'un tournoi peut autant te relancer que te briser. Réfléchis bien. »";
  }
  return "🧑‍🏫 Ton entraîneur en club : « Attention à ne pas revenir cramé pour la reprise du championnat... mais l'expérience internationale, ça ne se refuse pas. »";
}

export default function TournamentInvitePanel({ career }: { career: PlayerState }) {
  const acceptTournamentInvite = useGameStore((s) => s.acceptTournamentInvite);
  const declineTournamentInvite = useGameStore((s) => s.declineTournamentInvite);
  const [showAdviceMenu, setShowAdviceMenu] = useState(false);
  const [advice, setAdvice] = useState<{ from: Advisor; text: string } | null>(null);

  if (!career.pendingTournamentInvite) return null;
  const { tournamentName } = career.pendingTournamentInvite;
  const country = getCountry(career.countryCode);
  const isWorldCup = tournamentName === GLOBAL_TOURNAMENT_NAME;

  function ask(advisor: Advisor) {
    setAdvice({ from: advisor, text: buildAdvice(career, advisor) });
  }

  return (
    <div className="card animate-pop-in flex flex-col items-center gap-4 p-8 text-center">
      <span className="text-5xl">{isWorldCup ? '🌍' : '🏆'}</span>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gold-400">
        <CountryFlag code={career.countryCode} showCode={false} size="sm" />
        Convocation — sélection de {country.name}
      </div>
      <h2 className="font-display text-2xl text-ink-100">{tournamentName}</h2>
      <p className="max-w-lg text-sm text-ink-300">
        Le sélectionneur national t'appelle pour disputer <strong className="text-ink-100">{tournamentName}</strong> cette
        saison ! Souhaites-tu te lancer dans la grande aventure de la sélection, au risque de mettre ton club entre
        parenthèses le temps de la compétition ?
      </p>

      {advice && (
        <div className="animate-pop-in max-w-lg rounded-lg border border-gold-500/30 bg-pitch-800/60 p-3 text-sm text-ink-200">
          {advice.text}
        </div>
      )}

      {showAdviceMenu && !advice && (
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => ask('agent')} className="choice-option btn-outline rounded-full px-4 py-1.5 text-xs">
            🧳 Ton agent
          </button>
          <button onClick={() => ask('famille')} className="choice-option btn-outline rounded-full px-4 py-1.5 text-xs">
            👪 Ta famille
          </button>
          <button onClick={() => ask('entraineur')} className="choice-option btn-outline rounded-full px-4 py-1.5 text-xs">
            🧑‍🏫 Ton entraîneur en club
          </button>
        </div>
      )}

      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button onClick={acceptTournamentInvite} className="btn-gold rounded-full px-6 py-2.5 text-sm">
          ✅ Accepter la sélection
        </button>
        <button onClick={declineTournamentInvite} className="btn-outline rounded-full px-6 py-2.5 text-sm">
          🚫 Refuser — me concentrer sur mon club
        </button>
        {!showAdviceMenu && !advice && (
          <button
            onClick={() => setShowAdviceMenu(true)}
            className="btn-outline rounded-full px-6 py-2.5 text-sm hover:border-gold-500/50 hover:text-gold-400"
          >
            🤔 Demander conseil
          </button>
        )}
      </div>
    </div>
  );
}
