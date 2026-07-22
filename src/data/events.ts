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
} from '../engine/util';
import { getBackground } from './backgrounds';
import { getLifestyle } from './lifestyles';
import { getAgent } from './agents';
import { randomName } from './names';
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
    build: () => ({
      title: 'Un vétéran te prend sous son aile',
      text: "Le capitaine historique du club, en fin de carrière, te propose de passer du temps avec lui après les entraînements pour t'inculquer les ficelles du métier.",
      choices: [
        {
          label: 'Écouter ses conseils tactiques',
          apply: (s) => { adjustAttribute(s, 'vision', 3); adjustAttribute(s, 'mental', 1); return 'Ses analyses vidéo t’ouvrent les yeux sur la lecture du jeu. (+Vision, +Mental)'; },
        },
        {
          label: 'Apprendre son hygiène de vie irréprochable',
          apply: (s) => { adjustDiscipline(s, 6); adjustAttribute(s, 'physique', 2); return 'Sommeil, nutrition, récupération : tu adoptes ses habitudes de pro. (+Discipline, +Physique)'; },
        },
        {
          label: 'Garder tes distances, tu veux tracer ta route seul',
          apply: (s) => { adjustAttribute(s, 'mental', 2); adjustMorale(s, 2); return 'Tu restes fidèle à ta propre méthode. Ta confiance grandit. (+Mental, +Moral)'; },
        },
      ],
    }),
  },
  {
    id: 'school_dilemma',
    minAge: 16,
    maxAge: 18,
    weight: () => 9,
    build: () => ({
      title: 'Études ou ballon rond ?',
      text: "Le centre de formation te demande combien de temps consacrer aux études générales, au détriment potentiel des entraînements additionnels.",
      choices: [
        {
          label: 'Tout miser sur le foot',
          apply: (s) => { adjustAttribute(s, s.focusAttribute ?? 'technique', 3); adjustDiscipline(s, -4); return 'Chaque heure est investie sur le terrain. Progression rapide, mais aucun filet de sécurité.'; },
        },
        {
          label: 'Garder les études en parallèle',
          apply: (s) => {
            adjustDiscipline(s, 5);
            adjustAttribute(s, 'mental', 2);
            adjustFitness(s, -5);
            return 'Un plan B rassurant qui structure ton mental, mais le surmenage entre cours et entraînements se paie sur ta forme. (+Discipline, +Mental, -Forme)';
          },
        },
        {
          label: 'Trouver un juste équilibre',
          apply: (s) => { adjustMorale(s, 3); return 'Un compromis raisonnable, sans excès.'; },
        },
      ],
    }),
  },
  {
    id: 'first_big_match_nerves',
    minAge: 16,
    maxAge: 19,
    weight: () => 8,
    build: () => ({
      title: 'Le trac avant la grande affiche',
      text: "Ta première titularisation dans un match qui compte approche. Le stress monte.",
      choices: [
        {
          label: 'Travailler la préparation mentale',
          apply: (s) => { adjustAttribute(s, 'mental', 3); return 'Respiration, visualisation : tu abordes le jour J plus serein. (+Mental)'; },
        },
        {
          label: "Étudier les vidéos de l'adversaire",
          apply: (s) => { adjustAttribute(s, 'vision', 2); return 'Tu repères leurs failles avant même le coup d’envoi. (+Vision)'; },
        },
        {
          label: 'Faire comme si de rien n’était',
          apply: (s) => {
            if (nextChance(s, 0.45)) {
              adjustMorale(s, -8);
              adjustDiscipline(s, -3);
              return 'Le masque craque en plein match : la pression te submerge devant tout le monde. (-Moral, -Discipline)';
            }
            adjustMorale(s, 1);
            return 'Tu masques ton stress derrière une nonchalance affichée.';
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
    build: () => ({
      title: 'Douleurs de croissance',
      text: 'Ton corps change vite et les douleurs articulaires perturbent tes entraînements.',
      choices: [
        {
          label: 'Lever le pied quelques semaines',
          apply: (s) => { adjustFitness(s, 6); adjustAttribute(s, 'physique', -1); return 'Prudent : tu perds un peu de rythme mais épargnes ton corps.'; },
        },
        {
          label: 'Serrer les dents et continuer',
          apply: (s) => {
            if (shielded(s, 0.35)) { s.careerInjuries += 1; adjustFitness(s, -18); return 'La surcharge finit par te faire céder : petite blessure à la clé.'; }
            adjustAttribute(s, 'mental', 2);
            return 'Tu tiens bon et ton mental s’en trouve renforcé. (+Mental)';
          },
        },
        {
          label: 'Consulter un spécialiste',
          apply: (s) => { adjustFitness(s, 10); adjustAttribute(s, 'physique', 1); return 'Un suivi médical pointu accélère ta récupération. (+Physique)'; },
        },
      ],
    }),
  },
  {
    id: 'social_media_temptation',
    minAge: 16,
    maxAge: 24,
    weight: (s) => (hasTrait(s, 'fetard') || hasTrait(s, 'populaire_reseaux') ? 12 : 4),
    build: () => ({
      title: 'Une marque veut te sponsoriser sur les réseaux',
      text: 'Un influenceur bien connecté te propose un partenariat rémunéré, à condition d’être très actif en ligne.',
      choices: [
        {
          label: 'Accepter, exposition immédiate',
          apply: (s) => {
            if (nextChance(s, 0.4)) {
              adjustReputation(s, -6);
              adjustDiscipline(s, -8);
              return 'D’anciens posts refont surface et déclenchent un bad buzz retentissant. (-Réputation, -Discipline)';
            }
            adjustReputation(s, 6);
            adjustDiscipline(s, -5);
            return 'Ta notoriété grimpe, mais les distractions aussi. (+Réputation, -Discipline)';
          },
        },
        {
          label: 'Refuser, rester concentré',
          apply: (s) => { adjustDiscipline(s, 4); return 'Tu préserves ta discipline quotidienne. (+Discipline)'; },
        },
        {
          label: "Négocier discrètement via l'agent",
          apply: (s) => {
            const agent = getAgent(s.agentId);
            if (agent.id === 'aucun') {
              adjustReputation(s, -3);
              return "Sans agent pour négocier à ta place, les échanges directs tournent court et ternissent un peu ton image. (-Réputation)";
            }
            adjustReputation(s, 3);
            return `${agent.emoji} ${agent.name} trouve un compromis raisonnable, sans excès de visibilité. (+Réputation)`;
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
    build: () => ({
      title: 'Un coéquipier convoite ta place',
      text: 'La concurrence interne s’intensifie pour la place de titulaire à ton poste.',
      choices: [
        {
          label: "Le défier frontalement à l'entraînement",
          apply: (s) => {
            if (shielded(s, 0.35)) {
              adjustFitness(s, -12);
              adjustDiscipline(s, -3);
              return 'Le duel dégénère en contact rude : petite blessure et remontrances du staff à la clé. (-Forme, -Discipline)';
            }
            adjustAttribute(s, 'mental', 2);
            adjustAttribute(s, 'physique', 1);
            return 'Une rivalité saine qui tire ton niveau vers le haut. (+Mental, +Physique)';
          },
        },
        {
          label: "Proposer de s'entraider",
          apply: (s) => { adjustAttribute(s, 'vision', 2); adjustMorale(s, 3); return 'L’intelligence collective paie : vous progressez ensemble. (+Vision, +Moral)'; },
        },
        {
          label: 'Aller voir le coach pour clarifier la hiérarchie',
          apply: (s) => { adjustReputation(s, -3); adjustMorale(s, -5); return 'Le vestiaire te voit comme une balance : ta démarche se retourne contre toi. (-Réputation, -Moral)'; },
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
    build: () => ({
      title: 'La presse t’annonce déjà parti',
      text: 'Une rumeur de transfert enfle dans les médias, sans que rien ne soit encore négocié.',
      choices: [
        {
          label: 'Démentir publiquement',
          apply: (s) => { adjustDiscipline(s, 4); return 'Ton club apprécie ta loyauté affichée. (+Discipline)'; },
        },
        {
          label: 'Laisser planer le doute',
          apply: (s) => {
            adjustReputation(s, 4);
            adjustMorale(s, -2);
            if (nextChance(s, 0.35)) {
              adjustAttribute(s, 'mental', -2);
              return 'La rumeur enfle plus que prévu et parasite ta concentration à l’entraînement. (+Réputation, -Mental)';
            }
            return 'La pression monte sur le club pour te retenir... ou te vendre cher. (+Réputation)';
          },
        },
        {
          label: 'Ne rien dire',
          apply: () => 'Tu laisses parler les autres.',
        },
      ],
    }),
  },
  {
    id: 'captain_armband_offer',
    minAge: 22,
    maxAge: 38,
    weight: (s) => (s.club && s.club.tierIndex >= 3 && s.reputation >= 40 && !s.captain ? 10 : 0),
    build: () => ({
      title: 'Le brassard de capitaine',
      text: "L'entraîneur envisage de te confier le brassard de capitaine.",
      choices: [
        {
          label: 'Accepter avec fierté',
          apply: (s) => {
            s.captain = true;
            if (nextChance(s, 0.25)) {
              adjustAttribute(s, 'mental', -3);
              adjustMorale(s, -4);
              return 'Le poids du brassard te pèse plus que prévu : la pression te ronge. (-Mental, -Moral)';
            }
            adjustAttribute(s, 'mental', 3);
            adjustReputation(s, 5);
            return 'Un vrai tournant dans ta carrière : le vestiaire est désormais tourné vers toi. (+Mental, +Réputation)';
          },
        },
        {
          label: "Décliner, tu n'es pas prêt",
          apply: (s) => { adjustDiscipline(s, 3); return 'Une décision humble qui rassure le groupe sur tes intentions. (+Discipline)'; },
        },
      ],
    }),
  },
  {
    id: 'national_team_snub',
    minAge: 21,
    maxAge: 34,
    weight: (s) => (s.reputation >= 45 && s.caps === 0 ? 8 : 3),
    build: () => ({
      title: 'Non retenu malgré de bonnes stats',
      text: "Le sélectionneur national te snobe encore, malgré une saison pleine.",
      choices: [
        {
          label: 'Hausser le ton publiquement',
          apply: (s) => {
            if (nextChance(s, 0.45)) {
              s.nationalTeamDoorClosed = true;
              adjustReputation(s, -12);
              adjustMorale(s, -10);
              return 'Le sélectionneur, vexé, ferme définitivement la porte de la sélection nationale. (-Réputation, -Moral)';
            }
            adjustReputation(s, 5);
            adjustDiscipline(s, -6);
            return 'Ta sortie médiatique fait du bruit, pour le meilleur ou pour le pire. (+Réputation, -Discipline)';
          },
        },
        {
          label: 'Travailler en silence',
          apply: (s) => { adjustAttribute(s, 'mental', 3); adjustDiscipline(s, 3); return 'Tu ravales ta frustration et redoubles d’efforts. (+Mental, +Discipline)'; },
        },
        {
          label: "Faire jouer le réseau de l'agent",
          apply: (s) => {
            const agent = getAgent(s.agentId);
            if (agent.id === 'aucun') {
              adjustMorale(s, -4);
              return "Sans agent pour porter ta cause en coulisses, la frustration retombe sur toi seul. (-Moral)";
            }
            adjustReputation(s, 2);
            return `${agent.emoji} Des coups de fil discrets sont passés en coulisses par ${agent.name}. (+Réputation)`;
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
    build: () => ({
      title: 'Match couperet contre le rival historique',
      text: 'Le derby de la saison approche, la ville entière retient son souffle.',
      choices: [
        {
          label: 'Prendre le match à ton compte',
          apply: (s) => {
            if (nextChance(s, 0.55)) { adjustReputation(s, 8); adjustMorale(s, 6); return 'Tu portes ton équipe et deviens le héros du derby ! (+Réputation, +Moral)'; }
            adjustMorale(s, -6); adjustReputation(s, -2);
            return 'La pression te fait craquer au pire moment. Le derby tourne au cauchemar. (-Moral, -Réputation)';
          },
        },
        {
          label: 'Jouer collectif, rester discret',
          apply: (s) => { adjustAttribute(s, 'vision', 1); return 'Une prestation sobre et solide, sans éclat particulier. (+Vision)'; },
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
        title: 'Une marque veut faire de toi une égérie',
        text: `Un équipementier propose un contrat d'image estimé à ${formatMoney(bonus)}.`,
        choices: [
          {
            label: 'Accepter le contrat',
            apply: (s2) => {
              s2.savings += bonus;
              s2.marketValue += Math.round(bonus * 0.05);
              adjustReputation(s2, 4);
              adjustDiscipline(s2, -2);
              return `Un beau chèque de ${formatMoney(bonus)} crédité sur ton épargne, au prix de quelques heures de tournage en moins à l’entraînement.`;
            },
          },
          {
            label: 'Refuser, rester focus sport',
            apply: (s2) => { adjustDiscipline(s2, 3); return 'Le terrain avant tout. (+Discipline)'; },
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
    build: () => ({
      title: 'Prolongation en suspens',
      text: 'Le club traîne des pieds sur ta prolongation de contrat.',
      choices: [
        {
          label: "Mettre la pression via l'agent",
          apply: (s) => {
            const agent = getAgent(s.agentId);
            if (agent.id === 'aucun') {
              adjustMorale(s, -4);
              adjustReputation(s, -2);
              return "Sans agent pour porter le dossier, tes propres démarches agacent la direction du club. (-Moral, -Réputation)";
            }
            adjustReputation(s, 2);
            s.wage = Math.round(s.wage * 1.05);
            return `${agent.emoji} ${agent.name} hausse le ton en coulisses. Le salaire est revu à la hausse. (+Réputation)`;
          },
        },
        {
          label: 'Rester loyal, attendre',
          apply: (s) => { adjustDiscipline(s, 3); return 'Ta patience est appréciée du club. (+Discipline)'; },
        },
        {
          label: 'Demander publiquement un transfert',
          apply: (s) => {
            adjustReputation(s, -8);
            adjustDiscipline(s, -4);
            adjustMorale(s, -5);
            return 'Un fan backlash immédiat éclate sur les réseaux : les supporters ne pardonnent pas ce coup d’éclat. (-Réputation, -Discipline, -Moral)';
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
    build: () => ({
      title: 'Clash dans le vestiaire',
      text: 'Une dispute éclate entre des cadres du vestiaire et le staff technique. On attend ta position.',
      choices: [
        {
          label: 'Rester neutre, apaiser les tensions',
          apply: (s) => { adjustAttribute(s, 'mental', 2); return 'Ton sang-froid calme le jeu. (+Mental)'; },
        },
        {
          label: 'Soutenir le vestiaire',
          apply: (s) => {
            if (nextChance(s, 0.4)) {
              adjustDiscipline(s, -10);
              adjustMorale(s, -6);
              return 'Le coach sanctionne ta prise de position et t’écarte temporairement du groupe. (-Discipline, -Moral)';
            }
            adjustMorale(s, 4);
            adjustDiscipline(s, -2);
            return 'Le groupe apprécie ta loyauté, le staff un peu moins.';
          },
        },
        {
          label: 'Soutenir le staff technique',
          apply: (s) => { adjustDiscipline(s, 4); adjustMorale(s, -6); return 'Une position qui rassure l’encadrement, mais t’isole du reste du vestiaire. (+Discipline, -Moral)'; },
        },
      ],
    }),
  },
  {
    id: 'individual_award_nomination',
    minAge: 22,
    maxAge: 38,
    weight: (s) => (s.reputation >= 65 ? 9 : 0),
    build: () => ({
      title: 'Nommé pour un trophée individuel prestigieux',
      text: 'Ta saison exceptionnelle t’a valu une nomination pour une distinction individuelle majeure.',
      choices: [
        {
          label: 'Communiquer et savourer le moment',
          apply: (s) => {
            s.awards.push(`Nommé — saison ${s.season}`);
            if (nextChance(s, 0.3)) {
              adjustAttribute(s, 'mental', -2);
              adjustDiscipline(s, -5);
              return 'La tête enfle un peu trop vite : la nomination te fait perdre le fil de tes habitudes de pro. (-Mental, -Discipline)';
            }
            adjustReputation(s, 6);
            adjustDiscipline(s, -2);
            return 'Ton nom circule dans tous les médias sportifs de la planète.';
          },
        },
        {
          label: 'Rester humble, focus collectif',
          apply: (s) => { adjustAttribute(s, 'mental', 2); adjustDiscipline(s, 3); s.awards.push(`Nommé — saison ${s.season}`); return 'Une posture qui forge une réputation d’exemplarité.'; },
        },
      ],
    }),
  },
  {
    id: 'gambling_temptation',
    minAge: 19,
    maxAge: 33,
    weight: (s) => (hasTrait(s, 'fetard') ? 9 : 3),
    build: () => ({
      title: 'Soirée paris sportifs entre coéquipiers',
      text: 'Plusieurs coéquipiers t’invitent à une soirée arrosée autour des paris sportifs.',
      choices: [
        {
          label: 'Participer',
          apply: (s) => {
            if (shielded(s, 0.3)) { adjustDiscipline(s, -12); adjustMorale(s, -6); return 'La soirée dérape, des pertes d’argent et une réputation ternie en interne. (-Discipline, -Moral)'; }
            adjustMorale(s, 4);
            return 'Une soirée détente bien méritée, sans excès. (+Moral)';
          },
        },
        {
          label: 'Refuser poliment',
          apply: (s) => { adjustDiscipline(s, 4); return 'Une soirée tranquille, loin des tentations. (+Discipline)'; },
        },
      ],
    }),
  },
  {
    id: 'burnout_signal',
    minAge: 21,
    maxAge: 37,
    weight: (s) => (s.morale < 45 ? 10 : 4),
    build: () => ({
      title: 'Fatigue mentale accumulée',
      text: 'Le rythme des matchs et des déplacements pèse de plus en plus lourd sur ton moral.',
      choices: [
        {
          label: 'Prendre de vraies vacances',
          apply: (s) => { adjustMorale(s, 14); adjustFitness(s, 8); return 'Coupure totale : tu reviens ressourcé. (+Moral, +Forme)'; },
        },
        {
          label: 'Consulter un psychologue du sport',
          apply: (s) => { adjustAttribute(s, 'mental', 3); adjustMorale(s, 6); return 'Un accompagnement qui porte ses fruits sur la durée. (+Mental, +Moral)'; },
        },
        {
          label: 'Continuer sans rien changer',
          apply: (s) => {
            adjustMorale(s, -8);
            if (nextChance(s, 0.4)) {
              adjustAttribute(s, 'physique', -2);
              return "Le corps finit par accuser le coup : l'épuisement te ronge physiquement. (-Moral, -Physique)";
            }
            return 'Tu serres les dents, au risque de craquer plus tard. (-Moral)';
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
    build: () => ({
      title: 'Un crack de 17 ans débarque à ton poste',
      text: 'Le club a recruté un jeune prodige évoluant exactement à ton poste.',
      choices: [
        {
          label: 'Le prendre sous ton aile',
          apply: (s) => { adjustAttribute(s, 'mental', 2); adjustReputation(s, 4); return 'Un rôle de grand frère qui te grandit aux yeux de tous. (+Mental, +Réputation)'; },
        },
        {
          label: 'Le voir comme une menace et hausser ton niveau',
          apply: (s) => {
            const target = s.focusAttribute ?? 'physique';
            if (nextChance(s, 0.3)) {
              adjustAttribute(s, target, -2);
              return 'Tu forces le trait et prends de mauvaises habitudes à force d’en faire trop.';
            }
            adjustAttribute(s, target, 2);
            return 'La concurrence te pousse à repousser tes limites.';
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
    build: () => ({
      title: 'Faut-il tenter l’exil ?',
      text: "Ton championnat national manque de visibilité pour percer au plus haut niveau. Un club étranger modeste te propose sa confiance.",
      choices: [
        {
          label: "Tout quitter pour l'exil",
          apply: (s) => {
            if (nextChance(s, 0.35)) {
              adjustMorale(s, -10);
              adjustAttribute(s, 'mental', -2);
              return 'Le mal du pays et l’adaptation sont bien plus durs que prévu. (-Moral, -Mental)';
            }
            adjustAttribute(s, 'mental', 2);
            adjustReputation(s, 4);
            return 'Un saut dans l’inconnu, loin des tiens, mais vers plus d’exposition. (+Mental, +Réputation)';
          },
        },
        {
          label: 'Rester au pays, en sélection facilement',
          apply: (s) => { adjustMorale(s, 5); adjustDiscipline(s, 2); return 'Le confort du foyer, au prix d’un plafond de progression plus bas. (+Moral, +Discipline)'; },
        },
      ],
    }),
  },
  {
    id: 'media_controversy',
    minAge: 20,
    maxAge: 40,
    weight: (s) => (s.reputation >= 40 ? 6 : 2),
    build: () => ({
      title: 'Propos sortis de leur contexte',
      text: 'Une interview est reprise et déformée dans la presse, provoquant une petite polémique.',
      choices: [
        {
          label: 'Réagir en conférence de presse',
          apply: (s) => {
            if (nextChance(s, 0.3)) {
              adjustReputation(s, -6);
              adjustDiscipline(s, -3);
              return 'Ta mise au point envenime les choses au lieu de calmer le jeu. (-Réputation, -Discipline)';
            }
            adjustDiscipline(s, 3);
            return 'Une mise au point qui calme le jeu. (+Discipline)';
          },
        },
        {
          label: 'Ignorer la polémique',
          apply: (s) => { adjustReputation(s, -2); adjustAttribute(s, 'mental', 1); return 'Tu laisses l’orage passer sans réagir.'; },
        },
      ],
    }),
  },
  {
    id: 'family_pressure',
    minAge: 20,
    maxAge: 40,
    weight: (s) => (s.wage > 50000 ? 6 : 2),
    build: () => ({
      title: 'Pressions familiales',
      text: 'Ta réussite change la donne pour tes proches, qui te sollicitent de plus en plus.',
      choices: [
        {
          label: 'Aider financièrement sans compter',
          apply: (s) => { adjustMorale(s, 5); return 'Le cœur avant le compte en banque. (+Moral)'; },
        },
        {
          label: 'Poser des limites claires',
          apply: (s) => { adjustDiscipline(s, 4); adjustMorale(s, -3); return 'Une discussion difficile mais nécessaire. (+Discipline, -Moral)'; },
        },
      ],
    }),
  },
  {
    id: 'injury_setback',
    minAge: 18,
    maxAge: 40,
    weight: () => 4,
    build: () => ({
      title: 'Coup dur physique',
      text: 'Une blessure sérieuse t’éloigne des terrains pour plusieurs semaines.',
      choices: [
        {
          label: 'Rééducation stricte et patiente',
          apply: (s) => { s.careerInjuries += 1; adjustFitness(s, -10); adjustDiscipline(s, 4); return 'Tu reviens plus fort, sans précipitation. (+Discipline)'; },
        },
        {
          label: 'Revenir plus vite que prévu',
          apply: (s) => {
            s.careerInjuries += 1;
            adjustFitness(s, -20);
            if (shielded(s, 0.3)) { adjustFitness(s, -15); return 'Ton impatience se paie cash : rechute et forme au plus bas.'; }
            return 'Un pari osé qui, cette fois, ne se retourne pas contre toi.';
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
    build: () => ({
      title: 'La question de la retraite s’invite',
      text: 'Médias et proches s’interrogent ouvertement : n’est-il pas temps de raccrocher les crampons ?',
      choices: [
        {
          label: 'Ignorer et prouver qu’ils ont tort',
          apply: (s) => {
            if (nextChance(s, 0.3)) {
              adjustAttribute(s, 'physique', -2);
              adjustMorale(s, -5);
              return 'Le corps ne suit plus : la fatigue te trahit publiquement, donnant raison aux critiques. (-Physique, -Moral)';
            }
            adjustMorale(s, 6);
            adjustAttribute(s, 'mental', 2);
            return 'La colère nourrit une motivation retrouvée. (+Moral, +Mental)';
          },
        },
        {
          label: 'Écouter et planifier une sortie maîtrisée',
          apply: (s) => { adjustDiscipline(s, 5); adjustReputation(s, 2); return 'Une transition en douceur, préparée avec le club. (+Discipline, +Réputation)'; },
        },
      ],
    }),
  },
  {
    id: 'veteran_mentor_role',
    minAge: 33,
    maxAge: 45,
    weight: () => 8,
    build: () => ({
      title: 'Grand frère du vestiaire',
      text: 'Le club te demande d’endosser un rôle de mentor auprès des jeunes recrues.',
      choices: [
        {
          label: 'Accepter avec plaisir',
          apply: (s) => { adjustAttribute(s, 'mental', 2); adjustReputation(s, 5); return 'Ton influence dans le vestiaire grandit. (+Mental, +Réputation)'; },
        },
        {
          label: 'Rester focalisé sur ta propre performance',
          apply: (s) => { adjustAttribute(s, s.focusAttribute ?? 'physique', 2); return 'Tu restes égoïstement performant, pour le meilleur de l’équipe.'; },
        },
      ],
    }),
  },
  {
    id: 'body_maintenance',
    minAge: 32,
    maxAge: 45,
    weight: () => 9,
    build: () => ({
      title: 'Le corps ne répond plus comme avant',
      text: 'Les organismes vieillissent différemment : le tien commence à envoyer des signaux.',
      choices: [
        {
          label: 'Investir dans un préparateur physique privé',
          apply: (s) => { adjustFitness(s, 10); adjustAttribute(s, 'physique', 1); return 'Un investissement personnel qui ralentit le déclin. (+Forme, +Physique)'; },
        },
        {
          label: 'Adapter ton style de jeu, plus posé',
          apply: (s) => { adjustAttribute(s, 'vision', 2); return 'Moins de courses inutiles, plus d’intelligence de placement. (+Vision)'; },
        },
        {
          label: 'Nier le déclin et forcer comme avant',
          apply: (s) => {
            if (shielded(s, 0.35)) { s.careerInjuries += 1; adjustFitness(s, -20); return 'Le corps finit par lâcher : blessure à la clé.'; }
            return 'Un pari risqué qui, cette fois, passe.';
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
    build: () => ({
      title: 'Un match hommage en ton honneur',
      text: 'Un club marquant de ton parcours te propose d’organiser un match hommage à ta carrière.',
      choices: [
        {
          label: 'Accepter avec émotion',
          apply: (s) => { adjustReputation(s, 10); adjustMorale(s, 12); s.awards.push(`Match hommage — saison ${s.season}`); return 'Un stade plein debout, une standing ovation inoubliable. (+Réputation, +Moral)'; },
        },
        {
          label: 'Refuser, tu veux encore jouer sérieusement',
          apply: (s) => { adjustDiscipline(s, 3); adjustAttribute(s, 'mental', 2); return 'Rien ne t’arrêtera tant que tu peux encore courir. (+Discipline, +Mental)'; },
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
        title: 'Un pont d’or vers une ligue exotique',
        text: `Un club fortuné à l'étranger propose un contrat mirobolant estimé à ${formatMoney(offer)} par saison.`,
        choices: [
          {
            label: 'Accepter le pactole',
            apply: (s2) => {
              s2.wage = offer;
              adjustReputation(s2, -4);
              adjustMorale(s2, 8);
              if (nextChance(s2, 0.4)) {
                adjustAttribute(s2, 'physique', -3);
                return `Le confort financier avec un salaire de ${formatMoney(offer)}, mais le niveau sportif inférieur du championnat te fait clairement régresser. (-Physique)`;
              }
              return `Le confort financier avec un salaire de ${formatMoney(offer)}, loin des projecteurs du haut niveau.`;
            },
          },
          {
            label: 'Refuser, rester compétitif',
            apply: (s2) => { adjustAttribute(s2, 'mental', 2); adjustReputation(s2, 2); return 'Tu préfères te battre pour des titres plutôt que pour un chèque. (+Mental, +Réputation)'; },
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
    build: () => ({
      title: 'Vers une reconversion ?',
      text: "Tu pourrais entamer ton diplôme d'entraîneur en parallèle de ta carrière de joueur.",
      choices: [
        {
          label: 'Commencer la formation',
          apply: (s) => {
            adjustDiscipline(s, -2);
            s.awards.push('Formation entraîneur entamée');
            if (nextChance(s, 0.3)) {
              adjustAttribute(s, s.focusAttribute ?? 'physique', -2);
              return 'Le double projet grignote ton temps d’entraînement plus que prévu. (-Discipline)';
            }
            adjustAttribute(s, 'vision', 2);
            return 'Un double projet exigeant, mais un avenir qui se prépare. (+Vision)';
          },
        },
        {
          label: 'Rester focus à 100% sur le terrain',
          apply: (s) => { adjustAttribute(s, 'physique', 1); return 'Le présent avant tout. (+Physique)'; },
        },
      ],
    }),
  },
  {
    id: 'weather_pitch_adversity',
    minAge: 16,
    maxAge: 45,
    weight: () => 3,
    build: () => ({
      title: 'Conditions extrêmes',
      text: 'Un match se joue sous une pluie battante et un vent glacial.',
      choices: [
        {
          label: 'Adapter ton jeu',
          apply: (s) => { adjustAttribute(s, 'vision', 1); return 'Tu simplifies ton jeu et limites les risques. (+Vision)'; },
        },
        {
          label: 'Forcer le passage en puissance',
          apply: (s) => {
            if (nextChance(s, 0.5)) { adjustAttribute(s, 'physique', 1); return 'Le pari physique paie. (+Physique)'; }
            adjustFitness(s, -6);
            return 'Le pari physique se retourne contre toi. (-Forme)';
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
    build: () => ({
      title: 'Le pari de trop',
      text: "À quelques jours d'une finale décisive, une gêne musculaire inquiétante s'est réveillée à l'entraînement. Le staff médical est formel : jouer comporte un vrai risque physique.",
      choices: [
        {
          label: 'Jouer coûte que coûte, quel qu’en soit le prix',
          apply: (s) => {
            if (shielded(s, 0.55)) {
              const target = nextChance(s, 0.5) ? 'physique' : 'vitesse';
              const decay = nextInt(s, 5, 9);
              s.careerInjuries += 1;
              adjustFitness(s, -32);
              applyPermanentAttributeLoss(s, target, decay);
              return `Le pari se retourne contre toi : rupture grave, une bonne partie de la saison s'envole et une séquelle physique définitive t'accompagnera pour le reste de ta carrière (-${decay} ${target === 'physique' ? 'Physique' : 'Vitesse'} définitif).`;
            }
            adjustReputation(s, 12);
            adjustMorale(s, 10);
            return 'Tu forces le destin et deviens le héros d’un soir que personne n’oubliera. (+Réputation, +Moral)';
          },
        },
        {
          label: 'Te faire infiltrer pour tenir le choc',
          apply: (s) => {
            if (shielded(s, 0.3)) {
              const decay = nextInt(s, 2, 4);
              s.careerInjuries += 1;
              adjustFitness(s, -18);
              applyPermanentAttributeLoss(s, 'physique', decay);
              return `Le geste médical masque la douleur sans la soigner : séquelle physique durable (-${decay} Physique définitif).`;
            }
            adjustReputation(s, 5);
            return 'Le compromis médical tient bon le temps du match. (+Réputation)';
          },
        },
        {
          label: 'Déclarer forfait, priorité à la santé',
          apply: (s) => { adjustDiscipline(s, 3); adjustReputation(s, -3); return 'Le staff médical valide ta prudence, mais certains y voient un manque de tempérament dans les grands rendez-vous. (+Discipline, -Réputation)'; },
        },
      ],
    }),
  },
  {
    id: 'explosive_press_conference',
    minAge: 20,
    maxAge: 40,
    weight: (s) => (s.reputation >= 35 ? 6 : 2),
    build: () => ({
      title: 'Excès de confiance en conférence de presse',
      text: 'Un journaliste te pousse dans tes retranchements sur ton prochain adversaire. Le micro est chaud, les caméras tournent.',
      choices: [
        {
          label: "Humilier verbalement l'adversaire",
          apply: (s) => {
            if (nextChance(s, 0.4)) {
              adjustReputation(s, 14);
              adjustMorale(s, 6);
              return 'Ta sortie fracassante fait le tour des plateaux et galvanise tout un stade derrière toi. (+Réputation, +Moral)';
            }
            adjustReputation(s, -22);
            adjustDiscipline(s, -8);
            if (s.rival) s.rival.intensity = clamp(s.rival.intensity + 10, 0, 100);
            return "Tes propos se retournent contre toi en boucle sur tous les plateaux : ta réputation en prend un coup sévère et durable. (-Réputation, -Discipline)";
          },
        },
        {
          label: 'Rester factuel et respectueux',
          apply: (s) => { adjustReputation(s, 3); return 'Une posture sobre qui ne prête pas le flanc à la polémique. (+Réputation)'; },
        },
      ],
    }),
  },
  {
    id: 'reckless_tackle_training',
    minAge: 18,
    maxAge: 40,
    weight: () => 6,
    build: () => ({
      title: "Prouver ta valeur par la force",
      text: "Un exercice d'opposition à l'entraînement s'envenime. Le concurrent direct à ton poste ne te lâche pas d'une semelle.",
      choices: [
        {
          label: 'Taper fort pour marquer le territoire',
          apply: (s) => {
            if (shielded(s, 0.4)) {
              const target = nextChance(s, 0.5) ? 'physique' : 'vitesse';
              const decay = nextInt(s, 3, 6);
              s.careerInjuries += 1;
              adjustFitness(s, -25);
              applyPermanentAttributeLoss(s, target, decay);
              return `Le tacle se retourne violemment contre toi : blessure sérieuse et séquelle physique définitive (-${decay} ${target === 'physique' ? 'Physique' : 'Vitesse'}).`;
            }
            adjustAttribute(s, 'mental', 2);
            adjustReputation(s, 3);
            return 'Le message est passé, sans dégâts. Le staff technique note ton caractère. (+Mental, +Réputation)';
          },
        },
        {
          label: 'Jouer la carte de la technique, éviter le choc',
          apply: (s) => { adjustAttribute(s, 'technique', 2); return 'Tu réponds par le geste plutôt que par la force. (+Technique)'; },
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
    build: () => ({
      title: 'Une proposition trouble',
      text: "Un intermédiaire discret approche ton entourage : de l'argent facile contre quelques « arrangements » que tu préfères ne pas trop détailler.",
      choices: [
        {
          label: "Accepter, l'appât du gain",
          apply: (s) => {
            if (nextChance(s, 0.45)) {
              adjustReputation(s, -28);
              adjustDiscipline(s, -10);
              return "L'affaire fuite dans la presse : scandale retentissant, ta réputation est ternie durablement. (-Réputation, -Discipline)";
            }
            adjustDiscipline(s, -4);
            s.marketValue = Math.round(s.marketValue * 1.02);
            return "L'arrangement reste secret... pour cette fois. Un poids sur la conscience malgré tout. (-Discipline)";
          },
        },
        {
          label: 'Refuser et prévenir ton club',
          apply: (s) => { adjustReputation(s, 4); adjustDiscipline(s, 5); return 'Ta probité ne fait aucun doute aux yeux de tous. (+Réputation, +Discipline)'; },
        },
        {
          label: "En parler d'abord à ton agent",
          apply: (s) => {
            const agent = getAgent(s.agentId);
            if (agent.id === 'aucun') { adjustDiscipline(s, 4); return 'Sans représentant pour te conseiller, tu tranches seul et refuses net. (+Discipline)'; }
            if (agent.pressureModifier >= 1.5) {
              adjustReputation(s, -6);
              adjustDiscipline(s, 2);
              return `${agent.emoji} ${agent.name} y voit une opportunité et négocie l'affaire en coulisses... contre une coquette commission. Discipline préservée, réputation entachée. (-Réputation, +Discipline)`;
            }
            adjustReputation(s, 3);
            adjustDiscipline(s, 3);
            return `${agent.emoji} ${agent.name} te conseille formellement de refuser. Tu suis son avis. (+Réputation, +Discipline)`;
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
        ? 'Sans agent, tu dois gérer seul les prochaines étapes de ta carrière : négociations, image publique, planning des prochaines saisons.'
        : `${agent.emoji} ${agent.name} te convoque pour faire le point sur la direction à donner à ta carrière.`;
      return {
        title: 'Point de carrière',
        text,
        choices: [
          {
            label: 'Suivre sa stratégie à la lettre',
            apply: (s2) => {
              const agent2 = getAgent(s2.agentId);
              adjustReputation(s2, Math.round(2 * agent2.offerQualityModifier));
              return agent2.id === 'aucun'
                ? 'Tu traces ta route méthodiquement, sans intermédiaire. (+Réputation)'
                : `${agent2.emoji} Tu t'en remets entièrement à ${agent2.name} pour la suite. (+Réputation)`;
            },
          },
          {
            label: 'Le pousser à viser plus haut, quitte à forcer les portes',
            apply: (s2) => {
              if (nextChance(s2, 0.5)) { adjustReputation(s2, 6); return 'Un coup de bluff qui paie : ton dossier atterrit sur le bureau de clubs bien plus huppés. (+Réputation)'; }
              adjustDiscipline(s2, -4);
              return 'La manœuvre agace certains dirigeants, qui te trouvent trop gourmand pour ton rang. (-Discipline)';
            },
          },
          {
            label: 'Prendre du recul et décider par toi-même',
            apply: (s2) => { adjustAttribute(s2, 'mental', 2); return 'Tu apprends à faire confiance à ton propre jugement. (+Mental)'; },
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
    build: () => ({
      title: 'Une rivalité s’installe dans le vestiaire',
      text: 'Un coéquipier de ton niveau, agacé de rester dans ton ombre, multiplie les piques à ton égard depuis plusieurs semaines.',
      choices: [
        {
          label: 'Le remettre à sa place publiquement',
          apply: (s) => {
            const generated = randomName(s.countryCode, rngFromCarrier(s));
            const rivalName = `${generated.firstName} ${generated.lastName}`;
            s.rival = { name: rivalName, emergedSeason: s.season, intensity: 45 };
            adjustReputation(s, 2);
            adjustMorale(s, -3);
            return `Le clash est ouvertement lancé avec ${rivalName}. Le vestiaire retient son souffle. (+Réputation, -Moral)`;
          },
        },
        {
          label: 'Ignorer la provocation',
          apply: (s) => {
            const generated = randomName(s.countryCode, rngFromCarrier(s));
            const rivalName = `${generated.firstName} ${generated.lastName}`;
            s.rival = { name: rivalName, emergedSeason: s.season, intensity: 25 };
            adjustAttribute(s, 'mental', 2);
            return `Tu hausses les épaules, mais ${rivalName} ne compte visiblement pas en rester là. (+Mental)`;
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
      title: `Coup de sang avec ${s.rival!.name}`,
      text: `La tension avec ${s.rival!.name} atteint un nouveau pic après un nouvel accrochage à l'entraînement.`,
      choices: [
        {
          label: 'Envenimer la rivalité publiquement',
          apply: (s2) => {
            const rival = s2.rival!;
            rival.intensity = clamp(rival.intensity + 25, 0, 100);
            adjustReputation(s2, 4);
            adjustDiscipline(s2, -5);
            return `Tu alimentes le clash avec ${rival.name} au grand jour. (+Réputation, -Discipline)`;
          },
        },
        {
          label: 'Canaliser cette rivalité pour progresser',
          apply: (s2) => {
            const rival = s2.rival!;
            rival.intensity = clamp(rival.intensity + 10, 0, 100);
            adjustAttribute(s2, s2.focusAttribute ?? 'physique', 2);
            return `Cette concurrence te pousse à repousser tes limites face à ${rival.name}.`;
          },
        },
        {
          label: 'Tenter d’apaiser les choses',
          apply: (s2) => {
            const rival = s2.rival!;
            rival.intensity = clamp(rival.intensity - 20, 0, 100);
            adjustMorale(s2, 4);
            if (rival.intensity <= 10) {
              const name = rival.name;
              s2.rival = null;
              return `Une discussion sincère avec ${name} éteint la rivalité : vous repartez sur de bonnes bases. (+Moral)`;
            }
            return `Un premier pas vers l’apaisement avec ${rival.name}, sans tout résoudre. (+Moral)`;
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
      title: `Clash final avec ${s.rival!.name}`,
      text: `La rivalité avec ${s.rival!.name} atteint un point de rupture. Le vestiaire ne peut plus l'ignorer : une résolution est désormais inévitable.`,
      choices: [
        {
          label: 'Crever l’abcès en face à face',
          apply: (s2) => {
            const name = s2.rival!.name;
            if (nextChance(s2, 0.5)) {
              s2.rival = null;
              adjustAttribute(s2, 'mental', 3);
              adjustReputation(s2, 4);
              adjustMorale(s2, 6);
              return `Une explication franche avec ${name} désamorce tout : le respect mutuel prend le dessus. (+Mental, +Réputation, +Moral)`;
            }
            s2.rival = null;
            adjustReputation(s2, -18);
            adjustDiscipline(s2, -8);
            adjustMorale(s2, -8);
            return `La confrontation dégénère avec ${name} devant tout le vestiaire. Une image ternie qui te colle à la peau. (-Réputation, -Discipline, -Moral)`;
          },
        },
        {
          label: 'Demander une médiation via le staff',
          apply: (s2) => {
            const name = s2.rival!.name;
            s2.rival = null;
            adjustDiscipline(s2, 4);
            adjustMorale(s2, 2);
            return `Le staff impose une médiation encadrée avec ${name}. Rien n'est vraiment réglé sur le fond, mais la tension retombe. (+Discipline, +Moral)`;
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
    build: () => ({
      title: 'Une rencontre inattendue',
      text: "En dehors des terrains, tu croises quelqu'un qui capte immédiatement ton attention.",
      choices: [
        {
          label: 'Se lancer, tenter sa chance',
          apply: (s) => {
            const generated = randomName(s.countryCode, rngFromCarrier(s));
            const partnerName = `${generated.firstName} ${generated.lastName}`;
            s.relationship = { status: 'en_couple', partnerName, since: s.season, happiness: 60 };
            adjustMorale(s, 8);
            return `Le courant passe tout de suite avec ${partnerName}. Une nouvelle page de ta vie personnelle s'ouvre. (+Moral)`;
          },
        },
        {
          label: 'Rester concentré sur ta carrière',
          apply: (s) => { adjustDiscipline(s, 2); return 'Tu préfères ne rien précipiter pour le moment. (+Discipline)'; },
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
      title: `Moment à deux avec ${s.relationship.partnerName}`,
      text: `Entre les matchs et les déplacements, ${s.relationship.partnerName} aimerait passer plus de temps avec toi.`,
      choices: [
        {
          label: 'Organiser une escapade romantique',
          apply: (s2) => {
            const cost = Math.min(s2.savings, 2000);
            s2.savings -= cost;
            s2.relationship.happiness = clamp(s2.relationship.happiness + 10, 0, 100);
            adjustMorale(s2, 5);
            return `Une parenthèse à deux qui fait un bien fou à votre couple (-${formatMoney(cost)}, +Moral).`;
          },
        },
        {
          label: 'Rester concentré sur la saison',
          apply: (s2) => {
            s2.relationship.happiness = clamp(s2.relationship.happiness - 8, 0, 100);
            return `${s2.relationship.partnerName} comprend, mais la distance commence à se faire sentir.`;
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
      title: `Tension avec ${s.relationship.partnerName}`,
      text: `Les disputes se multiplient avec ${s.relationship.partnerName} ces derniers temps.`,
      choices: [
        {
          label: 'Prendre le temps de tout remettre à plat',
          apply: (s2) => {
            s2.relationship.happiness = clamp(s2.relationship.happiness + 20, 0, 100);
            adjustMorale(s2, -2);
            return 'Une discussion longue et nécessaire qui apaise les tensions, non sans un peu de fatigue émotionnelle. (-Moral)';
          },
        },
        {
          label: 'Laisser filer, trop occupé par le foot',
          apply: (s2) => {
            s2.relationship.happiness = clamp(s2.relationship.happiness - 15, 0, 100);
            if (s2.relationship.happiness <= 5) {
              const name = s2.relationship.partnerName;
              const wasMarried = s2.relationship.status === 'marie';
              s2.relationship = { status: 'celibataire', partnerName: null, since: s2.season, happiness: 50 };
              adjustMorale(s2, -12);
              return wasMarried
                ? `Le divorce est acté avec ${name}. Une page difficile se tourne sur le plan personnel. (-Moral)`
                : `La rupture est actée avec ${name}. Un vrai coup dur sur le plan personnel. (-Moral)`;
            }
            return 'Tu laisses la situation se dégrader, faute de temps à y consacrer.';
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
      title: `Faire sa demande à ${s.relationship.partnerName} ?`,
      text: `Après tout ce temps partagé, l'idée du mariage s'impose naturellement avec ${s.relationship.partnerName}.`,
      choices: [
        {
          label: 'Faire sa demande',
          apply: (s2) => {
            const cost = Math.min(s2.savings, 15000);
            s2.savings -= cost;
            s2.relationship.status = 'marie';
            s2.relationship.happiness = clamp(s2.relationship.happiness + 20, 0, 100);
            adjustMorale(s2, 15);
            return `Le grand oui ! Le mariage avec ${s2.relationship.partnerName} restera l'un des plus beaux jours de ta vie (-${formatMoney(cost)}, +Moral).`;
          },
        },
        {
          label: 'Attendre encore un peu',
          apply: () => 'Rien ne presse : tu préfères laisser mûrir les choses.',
        },
      ],
    }),
  },
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
