import type { PlayerState, EventChoiceOutcome } from '../engine/types';
import type { Rng } from '../engine/rng';
import { nextInt, nextChance, rngFromCarrier } from '../engine/rng';
import {
  adjustAttribute,
  adjustDiscipline,
  adjustFitness,
  adjustMorale,
  adjustReputation,
  applyPermanentAttributeLoss,
  clamp,
  formatMoney,
  loc,
} from '../engine/util';
import { getBackground } from './backgrounds';
import { getLifestyle } from './lifestyles';
import { getAgent } from './agents';
import { randomName } from './names';
import { MATCH_MOMENT_EVENTS } from './matchMoments';
import type { CountryTier } from './countries';

function shielded(state: PlayerState, baseProbability: number): boolean {
  const shield = (state.advantageEffects.discipline_shield ?? 0) + (state.advantageEffects.injury_shield ?? 0);
  return nextChance(state, clamp01(baseProbability * (1 - shield)));
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export interface EventTemplate {
  id: string;
  minAge: number;
  maxAge: number;
  once?: boolean; // ne peut se déclencher qu'une seule fois par carrière (scénario unique)
  weight: (state: PlayerState, countryTier: CountryTier) => number; // 0 = exclu
  build: (state: PlayerState, rng: Rng) => { title: string; text: string; choices: EventChoiceOutcome[] };
}

function hasTrait(state: PlayerState, trait: string): boolean {
  return (
    getBackground(state.backgroundId).traits.includes(trait) ||
    getLifestyle(state.lifestyleId).traits.includes(trait)
  );
}

const EVENTS: EventTemplate[] = [
  // ---------------- JEUNESSE (16-20) ----------------
  {
    id: 'mentor_veteran',
    minAge: 16,
    maxAge: 21,
    weight: () => 10,
    build: (s) => ({
      title: loc(s, 'Un vétéran te prend sous son aile', 'A veteran takes you under his wing'),
      text: loc(
        s,
        "Le capitaine historique du club, en fin de carrière, te propose de passer du temps avec lui après les entraînements pour t'inculquer les ficelles du métier.",
        "The club's long-time captain, nearing the end of his career, offers to spend time with you after training to teach you the tricks of the trade.",
      ),
      choices: [
        {
          label: loc(s, 'Écouter ses conseils tactiques', 'Listen to his tactical advice'),
          apply: (s) => { adjustAttribute(s, 'vision', 3); adjustAttribute(s, 'mental', 1); return loc(s, 'Ses analyses vidéo t’ouvrent les yeux sur la lecture du jeu. (+Vision, +Mental)', 'His video analysis opens your eyes to reading the game. (+Vision, +Mental)'); },
        },
        {
          label: loc(s, 'Apprendre son hygiène de vie irréprochable', 'Learn his impeccable lifestyle habits'),
          apply: (s) => { adjustDiscipline(s, 6); adjustAttribute(s, 'physique', 2); return loc(s, 'Sommeil, nutrition, récupération : tu adoptes ses habitudes de pro. (+Discipline, +Physique)', 'Sleep, nutrition, recovery: you adopt his professional habits. (+Discipline, +Physical)'); },
        },
        {
          label: loc(s, 'Garder tes distances, tu veux tracer ta route seul', 'Keep your distance, you want to make your own way'),
          apply: (s) => { adjustAttribute(s, 'mental', 2); adjustMorale(s, 2); return loc(s, 'Tu restes fidèle à ta propre méthode. Ta confiance grandit. (+Mental, +Moral)', 'You stay true to your own method. Your confidence grows. (+Mental, +Morale)'); },
        },
      ],
    }),
  },
  {
    id: 'school_dilemma',
    minAge: 16,
    maxAge: 18,
    weight: () => 9,
    build: (s) => ({
      title: loc(s, 'Études ou ballon rond ?', 'School or football?'),
      text: loc(
        s,
        "Le centre de formation te demande combien de temps consacrer aux études générales, au détriment potentiel des entraînements additionnels.",
        "The academy asks how much time you want to devote to general schooling, potentially at the expense of extra training.",
      ),
      choices: [
        {
          label: loc(s, 'Tout miser sur le foot', 'Bet everything on football'),
          apply: (s) => { adjustAttribute(s, s.focusAttribute ?? 'technique', 3); adjustDiscipline(s, -4); return loc(s, 'Chaque heure est investie sur le terrain. Progression rapide, mais aucun filet de sécurité.', 'Every hour goes into the pitch. Fast progress, but no safety net.'); },
        },
        {
          label: loc(s, 'Garder les études en parallèle', 'Keep up your studies alongside football'),
          apply: (s) => {
            adjustDiscipline(s, 5);
            adjustAttribute(s, 'mental', 2);
            adjustFitness(s, -5);
            return loc(s, 'Un plan B rassurant qui structure ton mental, mais le surmenage entre cours et entraînements se paie sur ta forme. (+Discipline, +Mental, -Forme)', 'A reassuring plan B that strengthens your mindset, but the overload between classes and training takes a toll on your fitness. (+Discipline, +Mental, -Fitness)');
          },
        },
        {
          label: loc(s, 'Trouver un juste équilibre', 'Find a fair balance'),
          apply: (s) => { adjustMorale(s, 3); return loc(s, 'Un compromis raisonnable, sans excès.', 'A reasonable compromise, nothing excessive.'); },
        },
      ],
    }),
  },
  {
    id: 'first_big_match_nerves',
    minAge: 16,
    maxAge: 19,
    weight: () => 8,
    build: (s) => ({
      title: loc(s, 'Le trac avant la grande affiche', 'Nerves before the big match'),
      text: loc(s, "Ta première titularisation dans un match qui compte approche. Le stress monte.", "Your first start in a match that matters is approaching. The stress is building."),
      choices: [
        {
          label: loc(s, 'Travailler la préparation mentale', 'Work on mental preparation'),
          apply: (s) => { adjustAttribute(s, 'mental', 3); return loc(s, 'Respiration, visualisation : tu abordes le jour J plus serein. (+Mental)', 'Breathing, visualization: you approach the big day calmer. (+Mental)'); },
        },
        {
          label: loc(s, "Étudier les vidéos de l'adversaire", "Study videos of the opponent"),
          apply: (s) => { adjustAttribute(s, 'vision', 2); return loc(s, 'Tu repères leurs failles avant même le coup d’envoi. (+Vision)', 'You spot their weaknesses before kickoff. (+Vision)'); },
        },
        {
          label: loc(s, 'Faire comme si de rien n’était', 'Act like nothing is wrong'),
          apply: (s) => {
            if (nextChance(s, 0.45)) {
              adjustMorale(s, -8);
              adjustDiscipline(s, -3);
              return loc(s, 'Le masque craque en plein match : la pression te submerge devant tout le monde. (-Moral, -Discipline)', 'The mask cracks mid-match: the pressure overwhelms you in front of everyone. (-Morale, -Discipline)');
            }
            adjustMorale(s, 1);
            return loc(s, 'Tu masques ton stress derrière une nonchalance affichée.', 'You mask your stress behind a display of nonchalance.');
          },
        },
      ],
    }),
  },
  {
    id: 'growth_spurt_injury',
    minAge: 16,
    maxAge: 19,
    weight: () => 7,
    build: (s) => ({
      title: loc(s, 'Douleurs de croissance', 'Growing pains'),
      text: loc(s, 'Ton corps change vite et les douleurs articulaires perturbent tes entraînements.', 'Your body is changing fast and joint pain is disrupting your training.'),
      choices: [
        {
          label: loc(s, 'Lever le pied quelques semaines', 'Ease off for a few weeks'),
          apply: (s) => { adjustFitness(s, 6); adjustAttribute(s, 'physique', -1); return loc(s, 'Prudent : tu perds un peu de rythme mais épargnes ton corps.', 'Cautious: you lose a bit of rhythm but spare your body.'); },
        },
        {
          label: loc(s, 'Serrer les dents et continuer', 'Grit your teeth and continue'),
          apply: (s) => {
            if (shielded(s, 0.35)) { s.careerInjuries += 1; adjustFitness(s, -18); return loc(s, 'La surcharge finit par te faire céder : petite blessure à la clé.', 'The overload eventually gets the better of you: a minor injury results.'); }
            adjustAttribute(s, 'mental', 2);
            return loc(s, 'Tu tiens bon et ton mental s’en trouve renforcé. (+Mental)', 'You hold firm and your mental strength grows. (+Mental)');
          },
        },
        {
          label: loc(s, 'Consulter un spécialiste', 'See a specialist'),
          apply: (s) => { adjustFitness(s, 10); adjustAttribute(s, 'physique', 1); return loc(s, 'Un suivi médical pointu accélère ta récupération. (+Physique)', 'Expert medical care speeds up your recovery. (+Physical)'); },
        },
      ],
    }),
  },
  {
    id: 'social_media_temptation',
    minAge: 16,
    maxAge: 24,
    weight: (s) => (hasTrait(s, 'fetard') || hasTrait(s, 'populaire_reseaux') ? 12 : 4),
    build: (s) => ({
      title: loc(s, 'Une marque veut te sponsoriser sur les réseaux', 'A brand wants to sponsor you on social media'),
      text: loc(s, 'Un influenceur bien connecté te propose un partenariat rémunéré, à condition d’être très actif en ligne.', 'A well-connected influencer offers you a paid partnership, on condition that you stay very active online.'),
      choices: [
        {
          label: loc(s, 'Accepter, exposition immédiate', 'Accept, instant exposure'),
          apply: (s) => {
            if (nextChance(s, 0.4)) {
              adjustReputation(s, -6);
              adjustDiscipline(s, -8);
              return loc(s, 'D’anciens posts refont surface et déclenchent un bad buzz retentissant. (-Réputation, -Discipline)', 'Old posts resurface and trigger a massive backlash. (-Reputation, -Discipline)');
            }
            adjustReputation(s, 6);
            adjustDiscipline(s, -5);
            return loc(s, 'Ta notoriété grimpe, mais les distractions aussi. (+Réputation, -Discipline)', 'Your profile rises, but so do the distractions. (+Reputation, -Discipline)');
          },
        },
        {
          label: loc(s, 'Refuser, rester concentré', 'Decline, stay focused'),
          apply: (s) => { adjustDiscipline(s, 4); return loc(s, 'Tu préserves ta discipline quotidienne. (+Discipline)', 'You preserve your daily discipline. (+Discipline)'); },
        },
        {
          label: loc(s, "Négocier discrètement via l'agent", "Negotiate discreetly through your agent"),
          apply: (s) => {
            const agent = getAgent(s.agentId);
            if (agent.id === 'aucun') {
              adjustReputation(s, -3);
              return loc(s, "Sans agent pour négocier à ta place, les échanges directs tournent court et ternissent un peu ton image. (-Réputation)", "With no agent to negotiate on your behalf, the direct talks fall flat and tarnish your image slightly. (-Reputation)");
            }
            adjustReputation(s, 3);
            return loc(s, `${agent.emoji} ${agent.name} trouve un compromis raisonnable, sans excès de visibilité. (+Réputation)`, `${agent.emoji} ${agent.name} finds a reasonable compromise, without excessive exposure. (+Reputation)`);
          },
        },
      ],
    }),
  },
  {
    id: 'rival_teammate_youth',
    minAge: 17,
    maxAge: 23,
    weight: () => 8,
    build: (s) => ({
      title: loc(s, 'Un coéquipier convoite ta place', 'A teammate covets your spot'),
      text: loc(s, 'La concurrence interne s’intensifie pour la place de titulaire à ton poste.', 'Internal competition for the starting spot at your position is heating up.'),
      choices: [
        {
          label: loc(s, "Le défier frontalement à l'entraînement", 'Challenge him head-on in training'),
          apply: (s) => {
            if (shielded(s, 0.35)) {
              adjustFitness(s, -12);
              adjustDiscipline(s, -3);
              return loc(s, 'Le duel dégénère en contact rude : petite blessure et remontrances du staff à la clé. (-Forme, -Discipline)', 'The duel turns into a rough clash: a minor injury and a scolding from the staff follow. (-Fitness, -Discipline)');
            }
            adjustAttribute(s, 'mental', 2);
            adjustAttribute(s, 'physique', 1);
            return loc(s, 'Une rivalité saine qui tire ton niveau vers le haut. (+Mental, +Physique)', 'A healthy rivalry that raises your level. (+Mental, +Physical)');
          },
        },
        {
          label: loc(s, "Proposer de s'entraider", 'Suggest helping each other out'),
          apply: (s) => { adjustAttribute(s, 'vision', 2); adjustMorale(s, 3); return loc(s, 'L’intelligence collective paie : vous progressez ensemble. (+Vision, +Moral)', 'Collective intelligence pays off: you improve together. (+Vision, +Morale)'); },
        },
        {
          label: loc(s, 'Aller voir le coach pour clarifier la hiérarchie', 'Go see the coach to clarify the pecking order'),
          apply: (s) => { adjustReputation(s, -3); adjustMorale(s, -5); return loc(s, 'Le vestiaire te voit comme une balance : ta démarche se retourne contre toi. (-Réputation, -Moral)', 'The locker room sees you as a snitch: your move backfires. (-Reputation, -Morale)'); },
        },
      ],
    }),
  },

  // ---------------- CARRIÈRE (21-32) ----------------
  {
    id: 'transfer_rumor_media',
    minAge: 20,
    maxAge: 32,
    weight: () => 7,
    build: (s) => ({
      title: loc(s, 'La presse t’annonce déjà parti', 'The press already has you gone'),
      text: loc(s, 'Une rumeur de transfert enfle dans les médias, sans que rien ne soit encore négocié.', 'A transfer rumor is spreading in the media, even though nothing has actually been negotiated.'),
      choices: [
        {
          label: loc(s, 'Démentir publiquement', 'Deny it publicly'),
          apply: (s) => { adjustDiscipline(s, 4); return loc(s, 'Ton club apprécie ta loyauté affichée. (+Discipline)', 'Your club appreciates your visible loyalty. (+Discipline)'); },
        },
        {
          label: loc(s, 'Laisser planer le doute', 'Let the doubt linger'),
          apply: (s) => {
            adjustReputation(s, 4);
            adjustMorale(s, -2);
            if (nextChance(s, 0.35)) {
              adjustAttribute(s, 'mental', -2);
              return loc(s, 'La rumeur enfle plus que prévu et parasite ta concentration à l’entraînement. (+Réputation, -Mental)', 'The rumor grows bigger than expected and disrupts your focus in training. (+Reputation, -Mental)');
            }
            return loc(s, 'La pression monte sur le club pour te retenir... ou te vendre cher. (+Réputation)', 'Pressure mounts on the club to keep you... or sell you high. (+Reputation)');
          },
        },
        {
          label: loc(s, 'Ne rien dire', 'Say nothing'),
          apply: (s) => loc(s, 'Tu laisses parler les autres.', 'You let others do the talking.'),
        },
      ],
    }),
  },
  {
    id: 'captain_armband_offer',
    minAge: 22,
    maxAge: 38,
    weight: (s) => (s.club && s.club.tierIndex >= 3 && s.reputation >= 40 && !s.captain ? 10 : 0),
    build: (s) => ({
      title: loc(s, 'Le brassard de capitaine', 'The captain’s armband'),
      text: loc(s, "L'entraîneur envisage de te confier le brassard de capitaine.", "The coach is considering handing you the captain's armband."),
      choices: [
        {
          label: loc(s, 'Accepter avec fierté', 'Accept with pride'),
          apply: (s) => {
            s.captain = true;
            if (nextChance(s, 0.25)) {
              adjustAttribute(s, 'mental', -3);
              adjustMorale(s, -4);
              return loc(s, 'Le poids du brassard te pèse plus que prévu : la pression te ronge. (-Mental, -Moral)', 'The weight of the armband is heavier than expected: the pressure eats away at you. (-Mental, -Morale)');
            }
            adjustAttribute(s, 'mental', 3);
            adjustReputation(s, 5);
            return loc(s, 'Un vrai tournant dans ta carrière : le vestiaire est désormais tourné vers toi. (+Mental, +Réputation)', 'A genuine turning point in your career: the locker room now looks to you. (+Mental, +Reputation)');
          },
        },
        {
          label: loc(s, "Décliner, tu n'es pas prêt", "Decline, you're not ready"),
          apply: (s) => { adjustDiscipline(s, 3); return loc(s, 'Une décision humble qui rassure le groupe sur tes intentions. (+Discipline)', 'A humble decision that reassures the group about your intentions. (+Discipline)'); },
        },
      ],
    }),
  },
  {
    id: 'national_team_snub',
    minAge: 21,
    maxAge: 34,
    weight: (s) => (s.reputation >= 45 && s.caps === 0 ? 8 : 3),
    build: (s) => ({
      title: loc(s, 'Non retenu malgré de bonnes stats', 'Left out despite good stats'),
      text: loc(s, "Le sélectionneur national te snobe encore, malgré une saison pleine.", "The national coach snubs you again, despite a full season."),
      choices: [
        {
          label: loc(s, 'Hausser le ton publiquement', 'Speak out publicly'),
          apply: (s) => {
            if (nextChance(s, 0.45)) {
              s.nationalTeamDoorClosed = true;
              adjustReputation(s, -12);
              adjustMorale(s, -10);
              return loc(s, 'Le sélectionneur, vexé, ferme définitivement la porte de la sélection nationale. (-Réputation, -Moral)', 'Offended, the national coach permanently closes the door to the national team. (-Reputation, -Morale)');
            }
            adjustReputation(s, 5);
            adjustDiscipline(s, -6);
            return loc(s, 'Ta sortie médiatique fait du bruit, pour le meilleur ou pour le pire. (+Réputation, -Discipline)', 'Your media outburst makes waves, for better or worse. (+Reputation, -Discipline)');
          },
        },
        {
          label: loc(s, 'Travailler en silence', 'Work in silence'),
          apply: (s) => { adjustAttribute(s, 'mental', 3); adjustDiscipline(s, 3); return loc(s, 'Tu ravales ta frustration et redoubles d’efforts. (+Mental, +Discipline)', 'You swallow your frustration and redouble your efforts. (+Mental, +Discipline)'); },
        },
        {
          label: loc(s, "Faire jouer le réseau de l'agent", "Use your agent's network"),
          apply: (s) => {
            const agent = getAgent(s.agentId);
            if (agent.id === 'aucun') {
              adjustMorale(s, -4);
              return loc(s, "Sans agent pour porter ta cause en coulisses, la frustration retombe sur toi seul. (-Moral)", "With no agent to plead your case behind the scenes, the frustration falls on you alone. (-Morale)");
            }
            adjustReputation(s, 2);
            return loc(s, `${agent.emoji} Des coups de fil discrets sont passés en coulisses par ${agent.name}. (+Réputation)`, `${agent.emoji} ${agent.name} makes a few discreet calls behind the scenes. (+Reputation)`);
          },
        },
      ],
    }),
  },
  {
    id: 'derby_pressure',
    minAge: 20,
    maxAge: 36,
    weight: (s) => (s.club && s.club.tierIndex >= 3 ? 7 : 2),
    build: (s) => ({
      title: loc(s, 'Match couperet contre le rival historique', 'Do-or-die match against the historic rival'),
      text: loc(s, 'Le derby de la saison approche, la ville entière retient son souffle.', 'The derby of the season is approaching, and the whole city is holding its breath.'),
      choices: [
        {
          label: loc(s, 'Prendre le match à ton compte', 'Take the match on your shoulders'),
          apply: (s) => {
            if (nextChance(s, 0.55)) { adjustReputation(s, 8); adjustMorale(s, 6); return loc(s, 'Tu portes ton équipe et deviens le héros du derby ! (+Réputation, +Moral)', 'You carry your team and become the hero of the derby! (+Reputation, +Morale)'); }
            adjustMorale(s, -6); adjustReputation(s, -2);
            return loc(s, 'La pression te fait craquer au pire moment. Le derby tourne au cauchemar. (-Moral, -Réputation)', 'The pressure gets to you at the worst possible moment. The derby turns into a nightmare. (-Morale, -Reputation)');
          },
        },
        {
          label: loc(s, 'Jouer collectif, rester discret', 'Play for the team, stay low-key'),
          apply: (s) => { adjustAttribute(s, 'vision', 1); return loc(s, 'Une prestation sobre et solide, sans éclat particulier. (+Vision)', 'A sober, solid performance, nothing flashy. (+Vision)'); },
        },
      ],
    }),
  },
  {
    id: 'sponsor_deal',
    minAge: 20,
    maxAge: 40,
    weight: (s) => (s.reputation >= 30 ? 7 : 2),
    build: (s) => {
      const bonus = 5000 + Math.round(s.reputation * 800);
      return {
        title: loc(s, 'Une marque veut faire de toi une égérie', 'A brand wants to make you the face of their campaign'),
        text: loc(s, `Un équipementier propose un contrat d'image estimé à ${formatMoney(bonus)}.`, `A sportswear brand offers an image contract valued at ${formatMoney(bonus)}.`),
        choices: [
          {
            label: loc(s, 'Accepter le contrat', 'Accept the contract'),
            apply: (s2) => {
              s2.savings += bonus;
              s2.marketValue += Math.round(bonus * 0.05);
              adjustReputation(s2, 4);
              adjustDiscipline(s2, -2);
              return loc(s2, `Un beau chèque de ${formatMoney(bonus)} crédité sur ton épargne, au prix de quelques heures de tournage en moins à l’entraînement.`, `A tidy ${formatMoney(bonus)} check lands in your savings, at the cost of a few training hours lost to filming.`);
            },
          },
          {
            label: loc(s, 'Refuser, rester focus sport', 'Decline, stay focused on the sport'),
            apply: (s2) => { adjustDiscipline(s2, 3); return loc(s2, 'Le terrain avant tout. (+Discipline)', 'The pitch comes first. (+Discipline)'); },
          },
        ],
      };
    },
  },
  {
    id: 'contract_renewal_tension',
    minAge: 22,
    maxAge: 34,
    weight: (s) => (s.club && s.club.tierIndex >= 2 ? 6 : 0),
    build: (s) => ({
      title: loc(s, 'Prolongation en suspens', 'Contract extension in limbo'),
      text: loc(s, 'Le club traîne des pieds sur ta prolongation de contrat.', 'The club is dragging its feet on your contract extension.'),
      choices: [
        {
          label: loc(s, "Mettre la pression via l'agent", 'Apply pressure through your agent'),
          apply: (s) => {
            const agent = getAgent(s.agentId);
            if (agent.id === 'aucun') {
              adjustMorale(s, -4);
              adjustReputation(s, -2);
              return loc(s, "Sans agent pour porter le dossier, tes propres démarches agacent la direction du club. (-Moral, -Réputation)", "With no agent to handle the matter, your own efforts irritate the club's management. (-Morale, -Reputation)");
            }
            adjustReputation(s, 2);
            s.wage = Math.round(s.wage * 1.05);
            return loc(s, `${agent.emoji} ${agent.name} hausse le ton en coulisses. Le salaire est revu à la hausse. (+Réputation)`, `${agent.emoji} ${agent.name} raises the tone behind the scenes. Your wage is revised upward. (+Reputation)`);
          },
        },
        {
          label: loc(s, 'Rester loyal, attendre', 'Stay loyal, wait it out'),
          apply: (s) => { adjustDiscipline(s, 3); return loc(s, 'Ta patience est appréciée du club. (+Discipline)', 'Your patience is appreciated by the club. (+Discipline)'); },
        },
        {
          label: loc(s, 'Demander publiquement un transfert', 'Publicly request a transfer'),
          apply: (s) => {
            adjustReputation(s, -8);
            adjustDiscipline(s, -4);
            adjustMorale(s, -5);
            return loc(s, 'Un fan backlash immédiat éclate sur les réseaux : les supporters ne pardonnent pas ce coup d’éclat. (-Réputation, -Discipline, -Moral)', 'An immediate fan backlash erupts on social media: the supporters do not forgive the stunt. (-Reputation, -Discipline, -Morale)');
          },
        },
      ],
    }),
  },
  {
    id: 'locker_room_conflict',
    minAge: 20,
    maxAge: 36,
    weight: () => 5,
    build: (s) => ({
      title: loc(s, 'Clash dans le vestiaire', 'Clash in the locker room'),
      text: loc(s, 'Une dispute éclate entre des cadres du vestiaire et le staff technique. On attend ta position.', 'A dispute breaks out between senior players and the coaching staff. Everyone is waiting to hear where you stand.'),
      choices: [
        {
          label: loc(s, 'Rester neutre, apaiser les tensions', 'Stay neutral, ease the tension'),
          apply: (s) => { adjustAttribute(s, 'mental', 2); return loc(s, 'Ton sang-froid calme le jeu. (+Mental)', 'Your composure calms things down. (+Mental)'); },
        },
        {
          label: loc(s, 'Soutenir le vestiaire', 'Back the locker room'),
          apply: (s) => {
            if (nextChance(s, 0.4)) {
              adjustDiscipline(s, -10);
              adjustMorale(s, -6);
              return loc(s, 'Le coach sanctionne ta prise de position et t’écarte temporairement du groupe. (-Discipline, -Moral)', 'The coach punishes your stance and temporarily benches you from the group. (-Discipline, -Morale)');
            }
            adjustMorale(s, 4);
            adjustDiscipline(s, -2);
            return loc(s, 'Le groupe apprécie ta loyauté, le staff un peu moins.', 'The group appreciates your loyalty, the staff a bit less so.');
          },
        },
        {
          label: loc(s, 'Soutenir le staff technique', 'Back the coaching staff'),
          apply: (s) => { adjustDiscipline(s, 4); adjustMorale(s, -6); return loc(s, 'Une position qui rassure l’encadrement, mais t’isole du reste du vestiaire. (+Discipline, -Moral)', 'A stance that reassures management but isolates you from the rest of the locker room. (+Discipline, -Morale)'); },
        },
      ],
    }),
  },
  {
    id: 'individual_award_nomination',
    minAge: 22,
    maxAge: 38,
    weight: (s) => (s.reputation >= 65 ? 9 : 0),
    build: (s) => ({
      title: loc(s, 'Nommé pour un trophée individuel prestigieux', 'Nominated for a prestigious individual award'),
      text: loc(s, 'Ta saison exceptionnelle t’a valu une nomination pour une distinction individuelle majeure.', 'Your outstanding season has earned you a nomination for a major individual honor.'),
      choices: [
        {
          label: loc(s, 'Communiquer et savourer le moment', 'Speak to the media and savor the moment'),
          apply: (s) => {
            s.awards.push(loc(s, `Nommé — saison ${s.season}`, `Nominated — season ${s.season}`));
            if (nextChance(s, 0.3)) {
              adjustAttribute(s, 'mental', -2);
              adjustDiscipline(s, -5);
              return loc(s, 'La tête enfle un peu trop vite : la nomination te fait perdre le fil de tes habitudes de pro. (-Mental, -Discipline)', 'It goes to your head a little too fast: the nomination throws off your professional habits. (-Mental, -Discipline)');
            }
            adjustReputation(s, 6);
            adjustDiscipline(s, -2);
            return loc(s, 'Ton nom circule dans tous les médias sportifs de la planète.', 'Your name is circulating across sports media worldwide.');
          },
        },
        {
          label: loc(s, 'Rester humble, focus collectif', 'Stay humble, focus on the team'),
          apply: (s) => { adjustAttribute(s, 'mental', 2); adjustDiscipline(s, 3); s.awards.push(loc(s, `Nommé — saison ${s.season}`, `Nominated — season ${s.season}`)); return loc(s, 'Une posture qui forge une réputation d’exemplarité.', 'A stance that builds a reputation for exemplary conduct.'); },
        },
      ],
    }),
  },
  {
    id: 'gambling_temptation',
    minAge: 19,
    maxAge: 33,
    weight: (s) => (hasTrait(s, 'fetard') ? 9 : 3),
    build: (s) => ({
      title: loc(s, 'Soirée paris sportifs entre coéquipiers', 'Sports-betting night with teammates'),
      text: loc(s, 'Plusieurs coéquipiers t’invitent à une soirée arrosée autour des paris sportifs.', 'Several teammates invite you to a boozy night out centered on sports betting.'),
      choices: [
        {
          label: loc(s, 'Participer', 'Join in'),
          apply: (s) => {
            if (shielded(s, 0.3)) { adjustDiscipline(s, -12); adjustMorale(s, -6); return loc(s, 'La soirée dérape, des pertes d’argent et une réputation ternie en interne. (-Discipline, -Moral)', 'The night spirals out of control: money lost and your standing tarnished internally. (-Discipline, -Morale)'); }
            adjustMorale(s, 4);
            return loc(s, 'Une soirée détente bien méritée, sans excès. (+Moral)', 'A well-deserved night off, without any excess. (+Morale)');
          },
        },
        {
          label: loc(s, 'Refuser poliment', 'Politely decline'),
          apply: (s) => { adjustDiscipline(s, 4); return loc(s, 'Une soirée tranquille, loin des tentations. (+Discipline)', 'A quiet night in, far from temptation. (+Discipline)'); },
        },
      ],
    }),
  },
  {
    id: 'burnout_signal',
    minAge: 21,
    maxAge: 37,
    weight: (s) => (s.morale < 45 ? 10 : 4),
    build: (s) => ({
      title: loc(s, 'Fatigue mentale accumulée', 'Accumulated mental fatigue'),
      text: loc(s, 'Le rythme des matchs et des déplacements pèse de plus en plus lourd sur ton moral.', 'The pace of matches and travel is weighing more and more heavily on your morale.'),
      choices: [
        {
          label: loc(s, 'Prendre de vraies vacances', 'Take a real vacation'),
          apply: (s) => { adjustMorale(s, 14); adjustFitness(s, 8); return loc(s, 'Coupure totale : tu reviens ressourcé. (+Moral, +Forme)', 'A total break: you come back recharged. (+Morale, +Fitness)'); },
        },
        {
          label: loc(s, 'Consulter un psychologue du sport', 'See a sports psychologist'),
          apply: (s) => { adjustAttribute(s, 'mental', 3); adjustMorale(s, 6); return loc(s, 'Un accompagnement qui porte ses fruits sur la durée. (+Mental, +Moral)', 'Support that pays off over time. (+Mental, +Morale)'); },
        },
        {
          label: loc(s, 'Continuer sans rien changer', 'Carry on without changing anything'),
          apply: (s) => {
            adjustMorale(s, -8);
            if (nextChance(s, 0.4)) {
              adjustAttribute(s, 'physique', -2);
              return loc(s, "Le corps finit par accuser le coup : l'épuisement te ronge physiquement. (-Moral, -Physique)", "Your body eventually takes the hit: exhaustion wears you down physically. (-Morale, -Physical)");
            }
            return loc(s, 'Tu serres les dents, au risque de craquer plus tard. (-Moral)', 'You grit your teeth, risking a breakdown later. (-Morale)');
          },
        },
      ],
    }),
  },
  {
    id: 'youth_prospect_rivalry',
    minAge: 27,
    maxAge: 34,
    weight: () => 6,
    build: (s) => ({
      title: loc(s, 'Un crack de 17 ans débarque à ton poste', 'A 17-year-old wonderkid arrives at your position'),
      text: loc(s, 'Le club a recruté un jeune prodige évoluant exactement à ton poste.', 'The club has signed a young prodigy who plays exactly your position.'),
      choices: [
        {
          label: loc(s, 'Le prendre sous ton aile', 'Take him under your wing'),
          apply: (s) => { adjustAttribute(s, 'mental', 2); adjustReputation(s, 4); return loc(s, 'Un rôle de grand frère qui te grandit aux yeux de tous. (+Mental, +Réputation)', 'A big-brother role that raises everyone\'s opinion of you. (+Mental, +Reputation)'); },
        },
        {
          label: loc(s, 'Le voir comme une menace et hausser ton niveau', 'See him as a threat and raise your level'),
          apply: (s) => {
            const target = s.focusAttribute ?? 'physique';
            if (nextChance(s, 0.3)) {
              adjustAttribute(s, target, -2);
              return loc(s, 'Tu forces le trait et prends de mauvaises habitudes à force d’en faire trop.', 'You push too hard and pick up bad habits from overdoing it.');
            }
            adjustAttribute(s, target, 2);
            return loc(s, 'La concurrence te pousse à repousser tes limites.', 'The competition pushes you to raise your game.');
          },
        },
      ],
    }),
  },
  {
    id: 'country_exile_choice',
    minAge: 18,
    maxAge: 27,
    weight: (_s, countryTier) => (countryTier === 'C' || countryTier === 'D' ? 11 : 0),
    build: (s) => ({
      title: loc(s, 'Faut-il tenter l’exil ?', 'Should you try your luck abroad?'),
      text: loc(
        s,
        "Ton championnat national manque de visibilité pour percer au plus haut niveau. Un club étranger modeste te propose sa confiance.",
        "Your domestic league lacks the visibility to break through at the highest level. A modest foreign club is offering you its trust.",
      ),
      choices: [
        {
          label: loc(s, "Tout quitter pour l'exil", 'Leave everything behind for a fresh start abroad'),
          apply: (s) => {
            if (nextChance(s, 0.35)) {
              adjustMorale(s, -10);
              adjustAttribute(s, 'mental', -2);
              return loc(s, 'Le mal du pays et l’adaptation sont bien plus durs que prévu. (-Moral, -Mental)', 'Homesickness and the adjustment are far harder than expected. (-Morale, -Mental)');
            }
            adjustAttribute(s, 'mental', 2);
            adjustReputation(s, 4);
            return loc(s, 'Un saut dans l’inconnu, loin des tiens, mais vers plus d’exposition. (+Mental, +Réputation)', 'A leap into the unknown, far from home, but toward greater exposure. (+Mental, +Reputation)');
          },
        },
        {
          label: loc(s, 'Rester au pays, en sélection facilement', 'Stay home, an easy pick for the national team'),
          apply: (s) => { adjustMorale(s, 5); adjustDiscipline(s, 2); return loc(s, 'Le confort du foyer, au prix d’un plafond de progression plus bas. (+Moral, +Discipline)', 'The comfort of home, at the cost of a lower ceiling for your progress. (+Morale, +Discipline)'); },
        },
      ],
    }),
  },
  {
    id: 'media_controversy',
    minAge: 20,
    maxAge: 40,
    weight: (s) => (s.reputation >= 40 ? 6 : 2),
    build: (s) => ({
      title: loc(s, 'Propos sortis de leur contexte', 'Comments taken out of context'),
      text: loc(s, 'Une interview est reprise et déformée dans la presse, provoquant une petite polémique.', 'An interview is picked up and distorted by the press, sparking a minor controversy.'),
      choices: [
        {
          label: loc(s, 'Réagir en conférence de presse', 'Respond at a press conference'),
          apply: (s) => {
            if (nextChance(s, 0.3)) {
              adjustReputation(s, -6);
              adjustDiscipline(s, -3);
              return loc(s, 'Ta mise au point envenime les choses au lieu de calmer le jeu. (-Réputation, -Discipline)', 'Your clarification makes things worse instead of calming them down. (-Reputation, -Discipline)');
            }
            adjustDiscipline(s, 3);
            return loc(s, 'Une mise au point qui calme le jeu. (+Discipline)', 'A clarification that settles things down. (+Discipline)');
          },
        },
        {
          label: loc(s, 'Ignorer la polémique', 'Ignore the controversy'),
          apply: (s) => { adjustReputation(s, -2); adjustAttribute(s, 'mental', 1); return loc(s, 'Tu laisses l’orage passer sans réagir.', 'You let the storm pass without reacting.'); },
        },
      ],
    }),
  },
  {
    id: 'family_pressure',
    minAge: 20,
    maxAge: 40,
    weight: (s) => (s.wage > 50000 ? 6 : 2),
    build: (s) => ({
      title: loc(s, 'Pressions familiales', 'Family pressure'),
      text: loc(s, 'Ta réussite change la donne pour tes proches, qui te sollicitent de plus en plus.', 'Your success changes things for your loved ones, who are asking more and more of you.'),
      choices: [
        {
          label: loc(s, 'Aider financièrement sans compter', 'Help out financially without counting the cost'),
          apply: (s) => { adjustMorale(s, 5); return loc(s, 'Le cœur avant le compte en banque. (+Moral)', 'The heart before the bank account. (+Morale)'); },
        },
        {
          label: loc(s, 'Poser des limites claires', 'Set clear boundaries'),
          apply: (s) => { adjustDiscipline(s, 4); adjustMorale(s, -3); return loc(s, 'Une discussion difficile mais nécessaire. (+Discipline, -Moral)', 'A difficult but necessary conversation. (+Discipline, -Morale)'); },
        },
      ],
    }),
  },
  {
    id: 'injury_setback',
    minAge: 18,
    maxAge: 40,
    weight: () => 4,
    build: (s) => ({
      title: loc(s, 'Coup dur physique', 'A tough physical blow'),
      text: loc(s, 'Une blessure sérieuse t’éloigne des terrains pour plusieurs semaines.', 'A serious injury keeps you off the pitch for several weeks.'),
      choices: [
        {
          label: loc(s, 'Rééducation stricte et patiente', 'Strict, patient rehab'),
          apply: (s) => { s.careerInjuries += 1; adjustFitness(s, -10); adjustDiscipline(s, 4); return loc(s, 'Tu reviens plus fort, sans précipitation. (+Discipline)', 'You come back stronger, without rushing it. (+Discipline)'); },
        },
        {
          label: loc(s, 'Revenir plus vite que prévu', 'Come back sooner than planned'),
          apply: (s) => {
            s.careerInjuries += 1;
            adjustFitness(s, -20);
            if (shielded(s, 0.3)) { adjustFitness(s, -15); return loc(s, 'Ton impatience se paie cash : rechute et forme au plus bas.', 'Your impatience costs you dearly: a relapse and your fitness bottoms out.'); }
            return loc(s, 'Un pari osé qui, cette fois, ne se retourne pas contre toi.', 'A bold gamble that, this time, does not backfire.');
          },
        },
      ],
    }),
  },

  // ---------------- VÉTÉRAN (33-45, carrière prolongée) ----------------
  {
    id: 'retirement_pressure',
    minAge: 34,
    maxAge: 45,
    weight: () => 9,
    build: (s) => ({
      title: loc(s, 'La question de la retraite s’invite', 'The retirement question comes up'),
      text: loc(s, 'Médias et proches s’interrogent ouvertement : n’est-il pas temps de raccrocher les crampons ?', 'Media and loved ones are openly asking: isn\'t it time to hang up your boots?'),
      choices: [
        {
          label: loc(s, 'Ignorer et prouver qu’ils ont tort', 'Ignore it and prove them wrong'),
          apply: (s) => {
            if (nextChance(s, 0.3)) {
              adjustAttribute(s, 'physique', -2);
              adjustMorale(s, -5);
              return loc(s, 'Le corps ne suit plus : la fatigue te trahit publiquement, donnant raison aux critiques. (-Physique, -Moral)', 'Your body can\'t keep up: fatigue betrays you in public, proving the critics right. (-Physical, -Morale)');
            }
            adjustMorale(s, 6);
            adjustAttribute(s, 'mental', 2);
            return loc(s, 'La colère nourrit une motivation retrouvée. (+Moral, +Mental)', 'Anger fuels a renewed sense of motivation. (+Morale, +Mental)');
          },
        },
        {
          label: loc(s, 'Écouter et planifier une sortie maîtrisée', 'Listen and plan a controlled exit'),
          apply: (s) => { adjustDiscipline(s, 5); adjustReputation(s, 2); return loc(s, 'Une transition en douceur, préparée avec le club. (+Discipline, +Réputation)', 'A smooth transition, planned together with the club. (+Discipline, +Reputation)'); },
        },
      ],
    }),
  },
  {
    id: 'veteran_mentor_role',
    minAge: 33,
    maxAge: 45,
    weight: () => 8,
    build: (s) => ({
      title: loc(s, 'Grand frère du vestiaire', 'Big brother of the locker room'),
      text: loc(s, 'Le club te demande d’endosser un rôle de mentor auprès des jeunes recrues.', 'The club is asking you to take on a mentoring role for the young recruits.'),
      choices: [
        {
          label: loc(s, 'Accepter avec plaisir', 'Accept gladly'),
          apply: (s) => { adjustAttribute(s, 'mental', 2); adjustReputation(s, 5); return loc(s, 'Ton influence dans le vestiaire grandit. (+Mental, +Réputation)', 'Your influence in the locker room grows. (+Mental, +Reputation)'); },
        },
        {
          label: loc(s, 'Rester focalisé sur ta propre performance', 'Stay focused on your own performance'),
          apply: (s) => { adjustAttribute(s, s.focusAttribute ?? 'physique', 2); return loc(s, 'Tu restes égoïstement performant, pour le meilleur de l’équipe.', 'You stay selfishly effective, for the good of the team.'); },
        },
      ],
    }),
  },
  {
    id: 'body_maintenance',
    minAge: 32,
    maxAge: 45,
    weight: () => 9,
    build: (s) => ({
      title: loc(s, 'Le corps ne répond plus comme avant', 'Your body doesn\'t respond like it used to'),
      text: loc(s, 'Les organismes vieillissent différemment : le tien commence à envoyer des signaux.', 'Everybody ages differently: yours is starting to send warning signs.'),
      choices: [
        {
          label: loc(s, 'Investir dans un préparateur physique privé', 'Invest in a private fitness coach'),
          apply: (s) => { adjustFitness(s, 10); adjustAttribute(s, 'physique', 1); return loc(s, 'Un investissement personnel qui ralentit le déclin. (+Forme, +Physique)', 'A personal investment that slows the decline. (+Fitness, +Physical)'); },
        },
        {
          label: loc(s, 'Adapter ton style de jeu, plus posé', 'Adapt your playing style, more measured'),
          apply: (s) => { adjustAttribute(s, 'vision', 2); return loc(s, 'Moins de courses inutiles, plus d’intelligence de placement. (+Vision)', 'Fewer unnecessary runs, smarter positioning. (+Vision)'); },
        },
        {
          label: loc(s, 'Nier le déclin et forcer comme avant', 'Deny the decline and push like before'),
          apply: (s) => {
            if (shielded(s, 0.35)) { s.careerInjuries += 1; adjustFitness(s, -20); return loc(s, 'Le corps finit par lâcher : blessure à la clé.', 'Your body eventually gives out: an injury results.'); }
            return loc(s, 'Un pari risqué qui, cette fois, passe.', 'A risky gamble that, this time, pays off.');
          },
        },
      ],
    }),
  },
  {
    id: 'testimonial_offer',
    minAge: 40,
    maxAge: 45,
    weight: (s) => (s.reputation >= 40 ? 10 : 4),
    build: (s) => ({
      title: loc(s, 'Un match hommage en ton honneur', 'A testimonial match in your honor'),
      text: loc(s, 'Un club marquant de ton parcours te propose d’organiser un match hommage à ta carrière.', 'A club that marked your career offers to organize a testimonial match in your honor.'),
      choices: [
        {
          label: loc(s, 'Accepter avec émotion', 'Accept, deeply moved'),
          apply: (s) => { adjustReputation(s, 10); adjustMorale(s, 12); s.awards.push(loc(s, `Match hommage — saison ${s.season}`, `Testimonial match — season ${s.season}`)); return loc(s, 'Un stade plein debout, une standing ovation inoubliable. (+Réputation, +Moral)', 'A packed stadium on its feet, an unforgettable standing ovation. (+Reputation, +Morale)'); },
        },
        {
          label: loc(s, 'Refuser, tu veux encore jouer sérieusement', 'Decline, you still want to play seriously'),
          apply: (s) => { adjustDiscipline(s, 3); adjustAttribute(s, 'mental', 2); return loc(s, 'Rien ne t’arrêtera tant que tu peux encore courir. (+Discipline, +Mental)', 'Nothing will stop you as long as you can still run. (+Discipline, +Mental)'); },
        },
      ],
    }),
  },
  {
    id: 'golden_league_exile',
    minAge: 33,
    maxAge: 43,
    weight: (s) => (s.reputation >= 50 ? 8 : 3),
    build: (s) => {
      const offer = Math.round(s.wage * 2.2) + 400000;
      return {
        title: loc(s, 'Un pont d’or vers une ligue exotique', 'A golden bridge to an exotic league'),
        text: loc(s, `Un club fortuné à l'étranger propose un contrat mirobolant estimé à ${formatMoney(offer)} par saison.`, `A wealthy foreign club offers a staggering contract estimated at ${formatMoney(offer)} per season.`),
        choices: [
          {
            label: loc(s, 'Accepter le pactole', 'Accept the windfall'),
            apply: (s2) => {
              s2.wage = offer;
              adjustReputation(s2, -4);
              adjustMorale(s2, 8);
              if (nextChance(s2, 0.4)) {
                adjustAttribute(s2, 'physique', -3);
                return loc(s2, `Le confort financier avec un salaire de ${formatMoney(offer)}, mais le niveau sportif inférieur du championnat te fait clairement régresser. (-Physique)`, `Financial comfort with a wage of ${formatMoney(offer)}, but the league's lower sporting level clearly sets you back. (-Physical)`);
              }
              return loc(s2, `Le confort financier avec un salaire de ${formatMoney(offer)}, loin des projecteurs du haut niveau.`, `Financial comfort with a wage of ${formatMoney(offer)}, far from the top-level spotlight.`);
            },
          },
          {
            label: loc(s, 'Refuser, rester compétitif', 'Decline, stay competitive'),
            apply: (s2) => { adjustAttribute(s2, 'mental', 2); adjustReputation(s2, 2); return loc(s2, 'Tu préfères te battre pour des titres plutôt que pour un chèque. (+Mental, +Réputation)', 'You\'d rather fight for titles than for a paycheck. (+Mental, +Reputation)'); },
          },
        ],
      };
    },
  },
  {
    id: 'coaching_badge_path',
    minAge: 35,
    maxAge: 45,
    weight: () => 7,
    build: (s) => ({
      title: loc(s, 'Vers une reconversion ?', 'Toward a career change?'),
      text: loc(s, "Tu pourrais entamer ton diplôme d'entraîneur en parallèle de ta carrière de joueur.", "You could start your coaching badge alongside your playing career."),
      choices: [
        {
          label: loc(s, 'Commencer la formation', 'Start the training'),
          apply: (s) => {
            adjustDiscipline(s, -2);
            s.coachingPathStarted = true;
            s.awards.push(loc(s, 'Formation entraîneur entamée', 'Coaching badge training started'));
            if (nextChance(s, 0.3)) {
              adjustAttribute(s, s.focusAttribute ?? 'physique', -2);
              return loc(s, 'Le double projet grignote ton temps d’entraînement plus que prévu. (-Discipline)', 'The dual project eats into your training time more than expected. (-Discipline)');
            }
            adjustAttribute(s, 'vision', 2);
            return loc(s, 'Un double projet exigeant, mais un avenir qui se prépare. (+Vision)', 'A demanding dual path, but a future taking shape. (+Vision)');
          },
        },
        {
          label: loc(s, 'Rester focus à 100% sur le terrain', 'Stay 100% focused on the pitch'),
          apply: (s) => { adjustAttribute(s, 'physique', 1); return loc(s, 'Le présent avant tout. (+Physique)', 'The present comes first. (+Physical)'); },
        },
      ],
    }),
  },
  {
    id: 'weather_pitch_adversity',
    minAge: 16,
    maxAge: 45,
    weight: () => 3,
    build: (s) => ({
      title: loc(s, 'Conditions extrêmes', 'Extreme conditions'),
      text: loc(s, 'Un match se joue sous une pluie battante et un vent glacial.', 'A match is played under pouring rain and a freezing wind.'),
      choices: [
        {
          label: loc(s, 'Adapter ton jeu', 'Adapt your game'),
          apply: (s) => { adjustAttribute(s, 'vision', 1); return loc(s, 'Tu simplifies ton jeu et limites les risques. (+Vision)', 'You simplify your game and limit the risks. (+Vision)'); },
        },
        {
          label: loc(s, 'Forcer le passage en puissance', 'Force your way through with power'),
          apply: (s) => {
            if (nextChance(s, 0.5)) { adjustAttribute(s, 'physique', 1); return loc(s, 'Le pari physique paie. (+Physique)', 'The physical gamble pays off. (+Physical)'); }
            adjustFitness(s, -6);
            return loc(s, 'Le pari physique se retourne contre toi. (-Forme)', 'The physical gamble backfires. (-Fitness)');
          },
        },
      ],
    }),
  },

  // ---------------- CHOIX À HAUT RISQUE (vraies répercussions négatives) ----------------
  {
    id: 'career_defining_gamble',
    minAge: 24,
    maxAge: 36,
    once: true,
    weight: (s) => (s.reputation >= 50 ? 9 : 0),
    build: (s) => ({
      title: loc(s, 'Le pari de trop', 'The gamble too far'),
      text: loc(
        s,
        "À quelques jours d'une finale décisive, une gêne musculaire inquiétante s'est réveillée à l'entraînement. Le staff médical est formel : jouer comporte un vrai risque physique.",
        "A few days before a decisive final, a worrying muscle twinge flared up in training. The medical staff is clear: playing carries a real physical risk.",
      ),
      choices: [
        {
          label: loc(s, 'Jouer coûte que coûte, quel qu’en soit le prix', 'Play no matter what, whatever the cost'),
          apply: (s) => {
            if (shielded(s, 0.55)) {
              const target = nextChance(s, 0.5) ? 'physique' : 'vitesse';
              const decay = nextInt(s, 5, 9);
              s.careerInjuries += 1;
              adjustFitness(s, -32);
              applyPermanentAttributeLoss(s, target, decay);
              const attrFr = target === 'physique' ? 'Physique' : 'Vitesse';
              const attrEn = target === 'physique' ? 'Physical' : 'Speed';
              return loc(
                s,
                `Le pari se retourne contre toi : rupture grave, une bonne partie de la saison s'envole et une séquelle physique définitive t'accompagnera pour le reste de ta carrière (-${decay} ${attrFr} définitif).`,
                `The gamble backfires: a serious tear, a big chunk of the season gone, and a permanent physical scar will follow you for the rest of your career (-${decay} ${attrEn} permanent).`,
              );
            }
            adjustReputation(s, 12);
            adjustMorale(s, 10);
            return loc(s, 'Tu forces le destin et deviens le héros d’un soir que personne n’oubliera. (+Réputation, +Moral)', 'You force destiny\'s hand and become the hero of a night no one will forget. (+Reputation, +Morale)');
          },
        },
        {
          label: loc(s, 'Te faire infiltrer pour tenir le choc', 'Get an injection to tough it out'),
          apply: (s) => {
            if (shielded(s, 0.3)) {
              const decay = nextInt(s, 2, 4);
              s.careerInjuries += 1;
              adjustFitness(s, -18);
              applyPermanentAttributeLoss(s, 'physique', decay);
              return loc(
                s,
                `Le geste médical masque la douleur sans la soigner : séquelle physique durable (-${decay} Physique définitif).`,
                `The medical procedure masks the pain without treating it: a lasting physical toll (-${decay} Physical permanent).`,
              );
            }
            adjustReputation(s, 5);
            return loc(s, 'Le compromis médical tient bon le temps du match. (+Réputation)', 'The medical compromise holds up for the length of the match. (+Reputation)');
          },
        },
        {
          label: loc(s, 'Déclarer forfait, priorité à la santé', 'Withdraw, health comes first'),
          apply: (s) => { adjustDiscipline(s, 3); adjustReputation(s, -3); return loc(s, 'Le staff médical valide ta prudence, mais certains y voient un manque de tempérament dans les grands rendez-vous. (+Discipline, -Réputation)', 'The medical staff approves of your caution, but some see it as a lack of nerve on the big occasions. (+Discipline, -Reputation)'); },
        },
      ],
    }),
  },
  {
    id: 'explosive_press_conference',
    minAge: 20,
    maxAge: 40,
    weight: (s) => (s.reputation >= 35 ? 6 : 2),
    build: (s) => ({
      title: loc(s, 'Excès de confiance en conférence de presse', 'Overconfidence at the press conference'),
      text: loc(s, 'Un journaliste te pousse dans tes retranchements sur ton prochain adversaire. Le micro est chaud, les caméras tournent.', 'A journalist pushes you into a corner about your next opponent. The mic is hot, the cameras are rolling.'),
      choices: [
        {
          label: loc(s, "Humilier verbalement l'adversaire", 'Verbally humiliate the opponent'),
          apply: (s) => {
            if (nextChance(s, 0.4)) {
              adjustReputation(s, 14);
              adjustMorale(s, 6);
              return loc(s, 'Ta sortie fracassante fait le tour des plateaux et galvanise tout un stade derrière toi. (+Réputation, +Moral)', 'Your explosive outburst makes the rounds on every talk show and galvanizes an entire stadium behind you. (+Reputation, +Morale)');
            }
            adjustReputation(s, -22);
            adjustDiscipline(s, -8);
            if (s.rival) s.rival.intensity = clamp(s.rival.intensity + 10, 0, 100);
            return loc(s, "Tes propos se retournent contre toi en boucle sur tous les plateaux : ta réputation en prend un coup sévère et durable. (-Réputation, -Discipline)", "Your words are played on a loop on every channel and turn against you: your reputation takes a severe, lasting hit. (-Reputation, -Discipline)");
          },
        },
        {
          label: loc(s, 'Rester factuel et respectueux', 'Stay factual and respectful'),
          apply: (s) => { adjustReputation(s, 3); return loc(s, 'Une posture sobre qui ne prête pas le flanc à la polémique. (+Réputation)', 'A composed stance that gives the controversy nothing to feed on. (+Reputation)'); },
        },
      ],
    }),
  },
  {
    id: 'reckless_tackle_training',
    minAge: 18,
    maxAge: 40,
    weight: () => 6,
    build: (s) => ({
      title: loc(s, "Prouver ta valeur par la force", "Prove your worth through force"),
      text: loc(s, "Un exercice d'opposition à l'entraînement s'envenime. Le concurrent direct à ton poste ne te lâche pas d'une semelle.", "A training drill turns nasty. The direct rival for your position won't let up on you."),
      choices: [
        {
          label: loc(s, 'Taper fort pour marquer le territoire', 'Go in hard to mark your territory'),
          apply: (s) => {
            if (shielded(s, 0.4)) {
              const target = nextChance(s, 0.5) ? 'physique' : 'vitesse';
              const decay = nextInt(s, 3, 6);
              s.careerInjuries += 1;
              adjustFitness(s, -25);
              applyPermanentAttributeLoss(s, target, decay);
              const attrFr = target === 'physique' ? 'Physique' : 'Vitesse';
              const attrEn = target === 'physique' ? 'Physical' : 'Speed';
              return loc(
                s,
                `Le tacle se retourne violemment contre toi : blessure sérieuse et séquelle physique définitive (-${decay} ${attrFr}).`,
                `The tackle violently backfires on you: a serious injury and a permanent physical toll (-${decay} ${attrEn}).`,
              );
            }
            adjustAttribute(s, 'mental', 2);
            adjustReputation(s, 3);
            return loc(s, 'Le message est passé, sans dégâts. Le staff technique note ton caractère. (+Mental, +Réputation)', 'The message lands, no harm done. The coaching staff takes note of your character. (+Mental, +Reputation)');
          },
        },
        {
          label: loc(s, 'Jouer la carte de la technique, éviter le choc', 'Play the technical card, avoid contact'),
          apply: (s) => { adjustAttribute(s, 'technique', 2); return loc(s, 'Tu réponds par le geste plutôt que par la force. (+Technique)', 'You respond with skill rather than force. (+Technique)'); },
        },
      ],
    }),
  },
  {
    id: 'black_market_agent_offer',
    minAge: 20,
    maxAge: 38,
    once: true,
    weight: (s) => (s.discipline < 55 || s.wage > 200000 ? 8 : 3),
    build: (s) => ({
      title: loc(s, 'Une proposition trouble', 'A shady proposition'),
      text: loc(
        s,
        "Un intermédiaire discret approche ton entourage : de l'argent facile contre quelques « arrangements » que tu préfères ne pas trop détailler.",
        "A discreet middleman approaches your entourage: easy money in exchange for a few \"arrangements\" you'd rather not look at too closely.",
      ),
      choices: [
        {
          label: loc(s, "Accepter, l'appât du gain", "Accept, the lure of easy money"),
          apply: (s) => {
            if (nextChance(s, 0.45)) {
              adjustReputation(s, -28);
              adjustDiscipline(s, -10);
              return loc(s, "L'affaire fuite dans la presse : scandale retentissant, ta réputation est ternie durablement. (-Réputation, -Discipline)", "The deal leaks to the press: a resounding scandal, your reputation lastingly tarnished. (-Reputation, -Discipline)");
            }
            adjustDiscipline(s, -4);
            s.marketValue = Math.round(s.marketValue * 1.02);
            return loc(s, "L'arrangement reste secret... pour cette fois. Un poids sur la conscience malgré tout. (-Discipline)", "The arrangement stays secret... for now. A weight on your conscience all the same. (-Discipline)");
          },
        },
        {
          label: loc(s, 'Refuser et prévenir ton club', 'Refuse and warn your club'),
          apply: (s) => { adjustReputation(s, 4); adjustDiscipline(s, 5); return loc(s, 'Ta probité ne fait aucun doute aux yeux de tous. (+Réputation, +Discipline)', 'Your integrity is beyond doubt in everyone\'s eyes. (+Reputation, +Discipline)'); },
        },
        {
          label: loc(s, "En parler d'abord à ton agent", "Talk to your agent about it first"),
          apply: (s) => {
            const agent = getAgent(s.agentId);
            if (agent.id === 'aucun') { adjustDiscipline(s, 4); return loc(s, 'Sans représentant pour te conseiller, tu tranches seul et refuses net. (+Discipline)', 'With no representative to advise you, you decide alone and refuse flatly. (+Discipline)'); }
            if (agent.pressureModifier >= 1.5) {
              adjustReputation(s, -6);
              adjustDiscipline(s, 2);
              return loc(s, `${agent.emoji} ${agent.name} y voit une opportunité et négocie l'affaire en coulisses... contre une coquette commission. Discipline préservée, réputation entachée. (-Réputation, +Discipline)`, `${agent.emoji} ${agent.name} sees an opportunity and negotiates the deal behind the scenes... for a tidy commission. Discipline preserved, reputation tarnished. (-Reputation, +Discipline)`);
            }
            adjustReputation(s, 3);
            adjustDiscipline(s, 3);
            return loc(s, `${agent.emoji} ${agent.name} te conseille formellement de refuser. Tu suis son avis. (+Réputation, +Discipline)`, `${agent.emoji} ${agent.name} firmly advises you to refuse. You follow his advice. (+Reputation, +Discipline)`);
          },
        },
      ],
    }),
  },

  // ---------------- INTERACTIONS RÉGULIÈRES AVEC L'AGENT ----------------
  {
    id: 'agent_career_checkin',
    minAge: 16,
    maxAge: 45,
    weight: () => 7,
    build: (s) => {
      const agent = getAgent(s.agentId);
      const text = agent.id === 'aucun'
        ? loc(s, 'Sans agent, tu dois gérer seul les prochaines étapes de ta carrière : négociations, image publique, planning des prochaines saisons.', 'With no agent, you have to manage the next steps of your career alone: negotiations, public image, planning for upcoming seasons.')
        : loc(s, `${agent.emoji} ${agent.name} te convoque pour faire le point sur la direction à donner à ta carrière.`, `${agent.emoji} ${agent.name} calls you in to discuss the direction of your career.`);
      return {
        title: loc(s, 'Point de carrière', 'Career check-in'),
        text,
        choices: [
          {
            label: loc(s, 'Suivre sa stratégie à la lettre', 'Follow his strategy to the letter'),
            apply: (s2) => {
              const agent2 = getAgent(s2.agentId);
              adjustReputation(s2, Math.round(2 * agent2.offerQualityModifier));
              return agent2.id === 'aucun'
                ? loc(s2, 'Tu traces ta route méthodiquement, sans intermédiaire. (+Réputation)', 'You chart your course methodically, without a middleman. (+Reputation)')
                : loc(s2, `${agent2.emoji} Tu t'en remets entièrement à ${agent2.name} pour la suite. (+Réputation)`, `${agent2.emoji} You put yourself entirely in ${agent2.name}'s hands going forward. (+Reputation)`);
            },
          },
          {
            label: loc(s, 'Le pousser à viser plus haut, quitte à forcer les portes', 'Push him to aim higher, even if it means forcing doors open'),
            apply: (s2) => {
              if (nextChance(s2, 0.5)) { adjustReputation(s2, 6); return loc(s2, 'Un coup de bluff qui paie : ton dossier atterrit sur le bureau de clubs bien plus huppés. (+Réputation)', 'A bluff that pays off: your file lands on the desks of far more prestigious clubs. (+Reputation)'); }
              adjustDiscipline(s2, -4);
              return loc(s2, 'La manœuvre agace certains dirigeants, qui te trouvent trop gourmand pour ton rang. (-Discipline)', 'The maneuver irritates some executives, who find you too greedy for your standing. (-Discipline)');
            },
          },
          {
            label: loc(s, 'Prendre du recul et décider par toi-même', 'Step back and decide for yourself'),
            apply: (s2) => { adjustAttribute(s2, 'mental', 2); return loc(s2, 'Tu apprends à faire confiance à ton propre jugement. (+Mental)', 'You learn to trust your own judgment. (+Mental)'); },
          },
        ],
      };
    },
  },

  // ---------------- RIVALITÉ DE VESTIAIRE PERSISTANTE ----------------
  {
    id: 'locker_room_rival_emerges',
    minAge: 18,
    maxAge: 40,
    weight: (s) => (s.rival ? 0 : 7),
    build: (s) => ({
      title: loc(s, 'Une rivalité s’installe dans le vestiaire', 'A rivalry takes root in the locker room'),
      text: loc(s, 'Un coéquipier de ton niveau, agacé de rester dans ton ombre, multiplie les piques à ton égard depuis plusieurs semaines.', 'A teammate of your caliber, tired of living in your shadow, has been taking jabs at you for weeks.'),
      choices: [
        {
          label: loc(s, 'Le remettre à sa place publiquement', 'Put him in his place publicly'),
          apply: (s) => {
            const generated = randomName(s.countryCode, rngFromCarrier(s));
            const rivalName = `${generated.firstName} ${generated.lastName}`;
            s.rival = { name: rivalName, emergedSeason: s.season, intensity: 45 };
            adjustReputation(s, 2);
            adjustMorale(s, -3);
            return loc(s, `Le clash est ouvertement lancé avec ${rivalName}. Le vestiaire retient son souffle. (+Réputation, -Moral)`, `The clash with ${rivalName} is now out in the open. The locker room holds its breath. (+Reputation, -Morale)`);
          },
        },
        {
          label: loc(s, 'Ignorer la provocation', 'Ignore the provocation'),
          apply: (s) => {
            const generated = randomName(s.countryCode, rngFromCarrier(s));
            const rivalName = `${generated.firstName} ${generated.lastName}`;
            s.rival = { name: rivalName, emergedSeason: s.season, intensity: 25 };
            adjustAttribute(s, 'mental', 2);
            return loc(s, `Tu hausses les épaules, mais ${rivalName} ne compte visiblement pas en rester là. (+Mental)`, `You shrug it off, but ${rivalName} clearly isn't done. (+Mental)`);
          },
        },
      ],
    }),
  },
  {
    id: 'rival_flare_up',
    minAge: 18,
    maxAge: 45,
    weight: (s) => (s.rival && s.rival.intensity < 85 ? 8 : 0),
    build: (s) => ({
      title: loc(s, `Coup de sang avec ${s.rival!.name}`, `Blow-up with ${s.rival!.name}`),
      text: loc(s, `La tension avec ${s.rival!.name} atteint un nouveau pic après un nouvel accrochage à l'entraînement.`, `Tension with ${s.rival!.name} reaches a new peak after another clash in training.`),
      choices: [
        {
          label: loc(s, 'Envenimer la rivalité publiquement', 'Stoke the rivalry publicly'),
          apply: (s2) => {
            const rival = s2.rival!;
            rival.intensity = clamp(rival.intensity + 25, 0, 100);
            adjustReputation(s2, 4);
            adjustDiscipline(s2, -5);
            return loc(s2, `Tu alimentes le clash avec ${rival.name} au grand jour. (+Réputation, -Discipline)`, `You fuel the clash with ${rival.name} out in the open. (+Reputation, -Discipline)`);
          },
        },
        {
          label: loc(s, 'Canaliser cette rivalité pour progresser', 'Channel this rivalry to improve'),
          apply: (s2) => {
            const rival = s2.rival!;
            rival.intensity = clamp(rival.intensity + 10, 0, 100);
            adjustAttribute(s2, s2.focusAttribute ?? 'physique', 2);
            return loc(s2, `Cette concurrence te pousse à repousser tes limites face à ${rival.name}.`, `This competition pushes you to raise your game against ${rival.name}.`);
          },
        },
        {
          label: loc(s, 'Tenter d’apaiser les choses', 'Try to smooth things over'),
          apply: (s2) => {
            const rival = s2.rival!;
            rival.intensity = clamp(rival.intensity - 20, 0, 100);
            adjustMorale(s2, 4);
            if (rival.intensity <= 10) {
              const name = rival.name;
              s2.rival = null;
              return loc(s2, `Une discussion sincère avec ${name} éteint la rivalité : vous repartez sur de bonnes bases. (+Moral)`, `A heartfelt talk with ${name} defuses the rivalry: you start over on good terms. (+Morale)`);
            }
            return loc(s2, `Un premier pas vers l’apaisement avec ${rival.name}, sans tout résoudre. (+Moral)`, `A first step toward peace with ${rival.name}, though not everything is resolved. (+Morale)`);
          },
        },
      ],
    }),
  },
  {
    id: 'rival_boiling_point',
    minAge: 18,
    maxAge: 45,
    weight: (s) => (s.rival && s.rival.intensity >= 85 ? 14 : 0),
    build: (s) => ({
      title: loc(s, `Clash final avec ${s.rival!.name}`, `Final showdown with ${s.rival!.name}`),
      text: loc(
        s,
        `La rivalité avec ${s.rival!.name} atteint un point de rupture. Le vestiaire ne peut plus l'ignorer : une résolution est désormais inévitable.`,
        `The rivalry with ${s.rival!.name} reaches breaking point. The locker room can no longer ignore it: a resolution is now inevitable.`,
      ),
      choices: [
        {
          label: loc(s, 'Crever l’abcès en face à face', 'Clear the air face to face'),
          apply: (s2) => {
            const name = s2.rival!.name;
            if (nextChance(s2, 0.5)) {
              s2.rival = null;
              adjustAttribute(s2, 'mental', 3);
              adjustReputation(s2, 4);
              adjustMorale(s2, 6);
              return loc(s2, `Une explication franche avec ${name} désamorce tout : le respect mutuel prend le dessus. (+Mental, +Réputation, +Moral)`, `A frank conversation with ${name} defuses everything: mutual respect wins out. (+Mental, +Reputation, +Morale)`);
            }
            s2.rival = null;
            adjustReputation(s2, -18);
            adjustDiscipline(s2, -8);
            adjustMorale(s2, -8);
            return loc(s2, `La confrontation dégénère avec ${name} devant tout le vestiaire. Une image ternie qui te colle à la peau. (-Réputation, -Discipline, -Moral)`, `The confrontation with ${name} spirals out of control in front of the whole locker room. A tarnished image that sticks to you. (-Reputation, -Discipline, -Morale)`);
          },
        },
        {
          label: loc(s, 'Demander une médiation via le staff', 'Request mediation through the staff'),
          apply: (s2) => {
            const name = s2.rival!.name;
            s2.rival = null;
            adjustDiscipline(s2, 4);
            adjustMorale(s2, 2);
            return loc(s2, `Le staff impose une médiation encadrée avec ${name}. Rien n'est vraiment réglé sur le fond, mais la tension retombe. (+Discipline, +Moral)`, `The staff imposes structured mediation with ${name}. Nothing is truly resolved deep down, but the tension eases. (+Discipline, +Morale)`);
          },
        },
      ],
    }),
  },

  // ---------------- VIE PRIVÉE : RELATION AMOUREUSE ----------------
  {
    id: 'romance_meet_someone',
    minAge: 18,
    maxAge: 45,
    weight: (s) => (s.relationship.status === 'celibataire' ? 6 : 0),
    build: (s) => ({
      title: loc(s, 'Une rencontre inattendue', 'An unexpected encounter'),
      text: loc(s, "En dehors des terrains, tu croises quelqu'un qui capte immédiatement ton attention.", "Away from the pitch, you meet someone who immediately catches your attention."),
      choices: [
        {
          label: loc(s, 'Se lancer, tenter sa chance', 'Go for it, take a chance'),
          apply: (s) => {
            const generated = randomName(s.countryCode, rngFromCarrier(s));
            const partnerName = `${generated.firstName} ${generated.lastName}`;
            s.relationship = { status: 'en_couple', partnerName, since: s.season, happiness: 60 };
            adjustMorale(s, 8);
            return loc(s, `Le courant passe tout de suite avec ${partnerName}. Une nouvelle page de ta vie personnelle s'ouvre. (+Moral)`, `The connection with ${partnerName} is instant. A new chapter of your personal life begins. (+Morale)`);
          },
        },
        {
          label: loc(s, 'Rester concentré sur ta carrière', 'Stay focused on your career'),
          apply: (s) => { adjustDiscipline(s, 2); return loc(s, 'Tu préfères ne rien précipiter pour le moment. (+Discipline)', 'You\'d rather not rush anything for now. (+Discipline)'); },
        },
      ],
    }),
  },
  {
    id: 'couple_quality_time',
    minAge: 18,
    maxAge: 45,
    weight: (s) => (s.relationship.status !== 'celibataire' ? 7 : 0),
    build: (s) => ({
      title: loc(s, `Moment à deux avec ${s.relationship.partnerName}`, `Quality time with ${s.relationship.partnerName}`),
      text: loc(s, `Entre les matchs et les déplacements, ${s.relationship.partnerName} aimerait passer plus de temps avec toi.`, `Between matches and travel, ${s.relationship.partnerName} would like to spend more time with you.`),
      choices: [
        {
          label: loc(s, 'Organiser une escapade romantique', 'Plan a romantic getaway'),
          apply: (s2) => {
            const cost = Math.min(s2.savings, 2000);
            s2.savings -= cost;
            s2.relationship.happiness = clamp(s2.relationship.happiness + 10, 0, 100);
            adjustMorale(s2, 5);
            return loc(s2, `Une parenthèse à deux qui fait un bien fou à votre couple (-${formatMoney(cost)}, +Moral).`, `A getaway together that does wonders for your relationship (-${formatMoney(cost)}, +Morale).`);
          },
        },
        {
          label: loc(s, 'Rester concentré sur la saison', 'Stay focused on the season'),
          apply: (s2) => {
            s2.relationship.happiness = clamp(s2.relationship.happiness - 8, 0, 100);
            return loc(s2, `${s2.relationship.partnerName} comprend, mais la distance commence à se faire sentir.`, `${s2.relationship.partnerName} understands, but the distance is starting to show.`);
          },
        },
      ],
    }),
  },
  {
    id: 'couple_conflict',
    minAge: 18,
    maxAge: 45,
    weight: (s) => (s.relationship.status !== 'celibataire' && s.relationship.happiness < 40 ? 9 : 0),
    build: (s) => ({
      title: loc(s, `Tension avec ${s.relationship.partnerName}`, `Tension with ${s.relationship.partnerName}`),
      text: loc(s, `Les disputes se multiplient avec ${s.relationship.partnerName} ces derniers temps.`, `Arguments with ${s.relationship.partnerName} have been piling up lately.`),
      choices: [
        {
          label: loc(s, 'Prendre le temps de tout remettre à plat', 'Take the time to sort everything out'),
          apply: (s2) => {
            s2.relationship.happiness = clamp(s2.relationship.happiness + 20, 0, 100);
            adjustMorale(s2, -2);
            return loc(s2, 'Une discussion longue et nécessaire qui apaise les tensions, non sans un peu de fatigue émotionnelle. (-Moral)', 'A long, necessary conversation that eases the tension, though not without some emotional fatigue. (-Morale)');
          },
        },
        {
          label: loc(s, 'Laisser filer, trop occupé par le foot', 'Let it slide, too busy with football'),
          apply: (s2) => {
            s2.relationship.happiness = clamp(s2.relationship.happiness - 15, 0, 100);
            if (s2.relationship.happiness <= 5) {
              const name = s2.relationship.partnerName;
              const wasMarried = s2.relationship.status === 'marie';
              s2.relationship = { status: 'celibataire', partnerName: null, since: s2.season, happiness: 50 };
              adjustMorale(s2, -12);
              return wasMarried
                ? loc(s2, `Le divorce est acté avec ${name}. Une page difficile se tourne sur le plan personnel. (-Moral)`, `The divorce with ${name} is finalized. A difficult chapter closes on the personal front. (-Morale)`)
                : loc(s2, `La rupture est actée avec ${name}. Un vrai coup dur sur le plan personnel. (-Moral)`, `The breakup with ${name} is final. A real blow on the personal front. (-Morale)`);
            }
            return loc(s2, 'Tu laisses la situation se dégrader, faute de temps à y consacrer.', 'You let the situation deteriorate, with no time to devote to it.');
          },
        },
      ],
    }),
  },
  {
    id: 'proposal_moment',
    minAge: 20,
    maxAge: 45,
    weight: (s) => (s.relationship.status === 'en_couple' && s.relationship.happiness >= 70 && s.season - s.relationship.since >= 2 ? 5 : 0),
    build: (s) => ({
      title: loc(s, `Faire sa demande à ${s.relationship.partnerName} ?`, `Propose to ${s.relationship.partnerName}?`),
      text: loc(s, `Après tout ce temps partagé, l'idée du mariage s'impose naturellement avec ${s.relationship.partnerName}.`, `After all this time together, the idea of marriage feels like a natural next step with ${s.relationship.partnerName}.`),
      choices: [
        {
          label: loc(s, 'Faire sa demande', 'Propose'),
          apply: (s2) => {
            const cost = Math.min(s2.savings, 15000);
            s2.savings -= cost;
            s2.relationship.status = 'marie';
            s2.relationship.happiness = clamp(s2.relationship.happiness + 20, 0, 100);
            adjustMorale(s2, 15);
            return loc(s2, `Le grand oui ! Le mariage avec ${s2.relationship.partnerName} restera l'un des plus beaux jours de ta vie (-${formatMoney(cost)}, +Moral).`, `The big yes! Your wedding with ${s2.relationship.partnerName} will remain one of the most beautiful days of your life (-${formatMoney(cost)}, +Morale).`);
          },
        },
        {
          label: loc(s, 'Attendre encore un peu', 'Wait a little longer'),
          apply: (s) => loc(s, 'Rien ne presse : tu préfères laisser mûrir les choses.', 'No rush: you\'d rather let things develop naturally.'),
        },
      ],
    }),
  },
  ...MATCH_MOMENT_EVENTS,
];

export function allEventTemplates(): EventTemplate[] {
  return EVENTS;
}

export function rollEvent(
  state: PlayerState,
  countryTier: CountryTier,
  exclude: string[],
): { template: EventTemplate; title: string; text: string; choices: EventChoiceOutcome[] } | null {
  const candidates = EVENTS.filter(
    (e) =>
      state.age >= e.minAge &&
      state.age <= e.maxAge &&
      !exclude.includes(e.id) &&
      !(e.once && state.firedOnceEventIds.includes(e.id)) &&
      e.weight(state, countryTier) > 0,
  );
  if (candidates.length === 0) return null;
  const total = candidates.reduce((sum, e) => sum + e.weight(state, countryTier), 0);
  let r = (nextInt(state, 0, 1_000_000) / 1_000_000) * total;
  let chosen = candidates[candidates.length - 1];
  for (const cand of candidates) {
    r -= cand.weight(state, countryTier);
    if (r <= 0) { chosen = cand; break; }
  }
  if (chosen.once) state.firedOnceEventIds = [...state.firedOnceEventIds, chosen.id];
  const rng = rngFromCarrier(state);
  const built = chosen.build(state, rng);
  return { template: chosen, title: built.title, text: built.text, choices: built.choices };
}
