import type { PlayerState, EventChoiceOutcome } from '../engine/types';
import type { Rng } from '../engine/rng';
import { nextInt, nextChance, rngFromCarrier } from '../engine/rng';
import { adjustAttribute, adjustDiscipline, adjustFitness, adjustMorale, adjustReputation, formatMoney } from '../engine/util';
import { getBackground } from './backgrounds';
import { getLifestyle } from './lifestyles';
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
          apply: (s) => { adjustDiscipline(s, 5); adjustAttribute(s, 'mental', 2); return 'Un plan B rassurant qui structure aussi ton mental.'; },
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
          apply: (s) => { adjustMorale(s, 1); return 'Tu masques ton stress derrière une nonchalance affichée.'; },
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
          apply: (s) => { adjustReputation(s, 6); adjustDiscipline(s, -5); return 'Ta notoriété grimpe, mais les distractions aussi. (+Réputation, -Discipline)'; },
        },
        {
          label: 'Refuser, rester concentré',
          apply: (s) => { adjustDiscipline(s, 4); return 'Tu préserves ta discipline quotidienne. (+Discipline)'; },
        },
        {
          label: "Négocier discrètement via l'agent",
          apply: (s) => { adjustReputation(s, 3); return 'Un compromis raisonnable, sans excès de visibilité. (+Réputation)'; },
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
          apply: (s) => { adjustAttribute(s, 'mental', 2); adjustAttribute(s, 'physique', 1); return 'Une rivalité saine qui tire ton niveau vers le haut. (+Mental, +Physique)'; },
        },
        {
          label: "Proposer de s'entraider",
          apply: (s) => { adjustAttribute(s, 'vision', 2); adjustMorale(s, 3); return 'L’intelligence collective paie : vous progressez ensemble. (+Vision, +Moral)'; },
        },
        {
          label: 'Aller voir le coach pour clarifier la hiérarchie',
          apply: (s) => { adjustReputation(s, 2); adjustMorale(s, -2); return 'Une démarche qui ne plaît pas à tout le monde dans le vestiaire.'; },
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
          apply: (s) => { adjustReputation(s, 4); adjustMorale(s, -2); return 'La pression monte sur le club pour te retenir... ou te vendre cher. (+Réputation)'; },
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
          apply: (s) => { s.captain = true; adjustAttribute(s, 'mental', 3); adjustReputation(s, 5); return 'Un vrai tournant dans ta carrière : le vestiaire est désormais tourné vers toi. (+Mental, +Réputation)'; },
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
          apply: (s) => { adjustReputation(s, 5); adjustDiscipline(s, -6); return 'Ta sortie médiatique fait du bruit, pour le meilleur ou pour le pire. (+Réputation, -Discipline)'; },
        },
        {
          label: 'Travailler en silence',
          apply: (s) => { adjustAttribute(s, 'mental', 3); adjustDiscipline(s, 3); return 'Tu ravales ta frustration et redoubles d’efforts. (+Mental, +Discipline)'; },
        },
        {
          label: "Faire jouer le réseau de l'agent",
          apply: (s) => { adjustReputation(s, 2); return 'Des coups de fil discrets sont passés en coulisses. (+Réputation)'; },
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
            apply: (s2) => { s2.marketValue += Math.round(bonus * 0.05); adjustReputation(s2, 4); adjustDiscipline(s2, -2); return `Un beau chèque de ${formatMoney(bonus)}, au prix de quelques heures de tournage en moins à l’entraînement.`; },
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
          apply: (s) => { adjustReputation(s, 2); s.wage = Math.round(s.wage * 1.05); return "Ton représentant hausse le ton en coulisses. Le salaire est revu à la hausse."; },
        },
        {
          label: 'Rester loyal, attendre',
          apply: (s) => { adjustDiscipline(s, 3); return 'Ta patience est appréciée du club. (+Discipline)'; },
        },
        {
          label: 'Demander publiquement un transfert',
          apply: (s) => { adjustReputation(s, 5); adjustDiscipline(s, -4); return 'Un coup d’éclat qui ne laisse personne indifférent. (+Réputation, -Discipline)'; },
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
          apply: (s) => { adjustMorale(s, 4); adjustDiscipline(s, -2); return 'Le groupe apprécie ta loyauté, le staff un peu moins.'; },
        },
        {
          label: 'Soutenir le staff technique',
          apply: (s) => { adjustDiscipline(s, 4); adjustMorale(s, -2); return 'Une position qui rassure l’encadrement.'; },
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
          apply: (s) => { adjustReputation(s, 6); adjustDiscipline(s, -2); s.awards.push(`Nommé — saison ${s.season}`); return 'Ton nom circule dans tous les médias sportifs de la planète.'; },
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
          apply: (s) => { adjustMorale(s, -8); return 'Tu serres les dents, au risque de craquer plus tard. (-Moral)'; },
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
          apply: (s) => { adjustAttribute(s, s.focusAttribute ?? 'physique', 2); return 'La concurrence te pousse à repousser tes limites.'; },
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
          apply: (s) => { adjustAttribute(s, 'mental', 2); adjustReputation(s, 4); return 'Un saut dans l’inconnu, loin des tiens, mais vers plus d’exposition. (+Mental, +Réputation)'; },
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
          apply: (s) => { adjustDiscipline(s, 3); return 'Une mise au point qui calme le jeu. (+Discipline)'; },
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
          apply: (s) => { adjustMorale(s, 6); adjustAttribute(s, 'mental', 2); return 'La colère nourrit une motivation retrouvée. (+Moral, +Mental)'; },
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
            apply: (s2) => { s2.wage = offer; adjustReputation(s2, -4); adjustMorale(s2, 8); return `Le confort financier avec un salaire de ${formatMoney(offer)}, loin des projecteurs du haut niveau.`; },
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
          apply: (s) => { adjustDiscipline(s, -2); adjustAttribute(s, 'vision', 2); s.awards.push('Formation entraîneur entamée'); return 'Un double projet exigeant, mais un avenir qui se prépare. (+Vision)'; },
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
    (e) => state.age >= e.minAge && state.age <= e.maxAge && !exclude.includes(e.id) && e.weight(state, countryTier) > 0,
  );
  if (candidates.length === 0) return null;
  const total = candidates.reduce((sum, e) => sum + e.weight(state, countryTier), 0);
  let r = (nextInt(state, 0, 1_000_000) / 1_000_000) * total;
  let chosen = candidates[candidates.length - 1];
  for (const cand of candidates) {
    r -= cand.weight(state, countryTier);
    if (r <= 0) { chosen = cand; break; }
  }
  const rng = rngFromCarrier(state);
  const built = chosen.build(state, rng);
  return { template: chosen, title: built.title, text: built.text, choices: built.choices };
}
