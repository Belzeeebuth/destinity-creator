// Point de mi-saison : une courte pause interactive (trêve hivernale) entre les évènements
// de pré-saison et la simulation complète, pour casser l'instantanéité de la saison.
import type { EventTemplate } from './events';
import type { EventChoiceOutcome, PlayerState } from '../engine/types';
import { nextChance, nextInt, nextPick, rngFromCarrier } from '../engine/rng';
import { adjustAttribute, adjustDiscipline, adjustFitness, adjustMorale, adjustReputation, clamp, loc } from '../engine/util';

// Instantané de match ordinaire (pas une finale) : un concentré de tension à n'importe quel
// moment d'une rencontre de championnat, pour que ces grands moments décisifs par poste ne
// restent pas cantonnés aux rares finales de coupe. Effets plus mesurés qu'en finale (pas de
// trophée à la clé), mais l'occasion revient régulièrement au fil de la carrière.
const MATCH_MINUTES = ["12e minute", "24e minute", "38e minute", "52e minute", "63e minute", "71e minute", "80e minute", "86e minute", "90e+2"];
const MATCH_MINUTES_EN = ["12th minute", "24th minute", "38th minute", "52nd minute", "63rd minute", "71st minute", "80th minute", "86th minute", "90+2"];

export const MID_SEASON_EVENTS: EventTemplate[] = [
  {
    id: 'mid_season_recharge',
    minAge: 16,
    maxAge: 45,
    weight: () => 6,
    build: (s) => ({
      title: loc(s, 'Trêve hivernale', 'Winter break'),
      text: loc(s, 'La première partie de saison s’achève. Le staff te propose de couper pour recharger les batteries avant les échéances décisives.', 'The first half of the season is over. The staff suggests taking a break to recharge before the decisive fixtures.'),
      choices: [
        {
          label: loc(s, 'Profiter pleinement de la coupure', 'Make the most of the break'),
          apply: (s) => { adjustFitness(s, 12); adjustMorale(s, 8); return loc(s, 'Tu reviens des vacances requinqué, prêt pour la seconde partie de saison. (+Forme, +Moral)', 'You come back from vacation refreshed, ready for the second half of the season. (+Fitness, +Morale)'); },
        },
        {
          label: loc(s, 'Enchaîner les séances individuelles', 'Keep grinding through individual sessions'),
          apply: (s) => { adjustAttribute(s, s.focusAttribute ?? 'technique', 2); adjustFitness(s, -5); return loc(s, 'Aucune coupure : tu travailles ton point fort pendant que les autres se reposent.', 'No break: you work on your strength while everyone else rests.'); },
        },
      ],
    }),
  },
  {
    id: 'mid_season_form',
    minAge: 16,
    maxAge: 45,
    weight: () => 6,
    build: (s) => ({
      title: loc(s, 'Coup de forme ou coup de mou ?', 'Hot streak or rough patch?'),
      text: loc(s, 'À mi-parcours, la presse spécialisée analyse ta première partie de saison.', 'At the halfway point, the sports press analyzes your first half of the season.'),
      choices: [
        {
          label: loc(s, 'Hausser le ton en interview pour te motiver', 'Raise your tone in interviews to fire yourself up'),
          apply: (s) => {
            if (nextChance(s, 0.6)) { adjustMorale(s, 10); return loc(s, 'Ta sortie médiatique galvanise ton entourage. (+Moral)', 'Your media outburst galvanizes those around you. (+Morale)'); }
            adjustDiscipline(s, -4);
            return loc(s, 'Tes propos sont mal reçus en interne. (-Discipline)', 'Your comments are poorly received internally. (-Discipline)');
          },
        },
        {
          label: loc(s, 'Rester discret et laisser parler le terrain', 'Stay low-key and let your performances speak'),
          apply: (s) => { adjustAttribute(s, 'mental', 2); return loc(s, 'Une posture sobre qui te renforce mentalement. (+Mental)', 'A composed approach that strengthens you mentally. (+Mental)'); },
        },
      ],
    }),
  },
  {
    id: 'mid_season_stage',
    minAge: 16,
    maxAge: 26,
    weight: () => 5,
    build: (s) => ({
      title: loc(s, 'Stage avec les espoirs', 'Training camp with the youth squad'),
      text: loc(s, 'Un stage avec la sélection espoirs est organisé pendant la trêve.', 'A training camp with the U21 national squad is organized during the break.'),
      choices: [
        {
          label: loc(s, 'Y participer avec sérieux', 'Take part seriously'),
          apply: (s) => { adjustReputation(s, 3); adjustAttribute(s, 'vision', 1); return loc(s, 'Une belle vitrine devant les recruteurs nationaux. (+Réputation, +Vision)', 'A great showcase in front of national scouts. (+Reputation, +Vision)'); },
        },
        {
          label: loc(s, 'Décliner pour te reposer', 'Decline to rest'),
          apply: (s) => { adjustFitness(s, 6); return loc(s, 'Tu préserves ton corps pour la suite de la saison. (+Forme)', 'You protect your body for the rest of the season. (+Fitness)'); },
        },
      ],
    }),
  },
  {
    id: 'mid_season_market_rumor',
    minAge: 18,
    maxAge: 45,
    weight: () => 5,
    build: (s) => ({
      title: loc(s, 'Rumeur de mercato hivernal', 'Winter transfer rumor'),
      text: loc(s, 'Un club approche discrètement ton entourage en plein cœur de saison.', 'A club discreetly approaches your entourage in the middle of the season.'),
      choices: [
        {
          label: loc(s, 'Écouter poliment, sans t’engager', 'Listen politely, without committing'),
          apply: (s) => { adjustReputation(s, 2); return loc(s, 'Tu restes concentré sur l’objectif du moment. (+Réputation)', 'You stay focused on the task at hand. (+Reputation)'); },
        },
        {
          label: loc(s, 'Couper court immédiatement', 'Shut it down immediately'),
          apply: (s) => { adjustDiscipline(s, 3); return loc(s, 'Ton club apprécie ta loyauté affichée en pleine saison. (+Discipline)', 'Your club appreciates your visible loyalty mid-season. (+Discipline)'); },
        },
      ],
    }),
  },
  {
    id: 'mid_season_injury_scare',
    minAge: 16,
    maxAge: 45,
    weight: () => 4,
    build: (s) => ({
      title: loc(s, 'Alerte physique', 'Physical scare'),
      text: loc(s, 'Une gêne récurrente inquiète le staff médical à mi-saison.', 'A recurring niggle worries the medical staff at mid-season.'),
      choices: [
        {
          label: loc(s, 'Passer des examens complets par précaution', 'Get a full check-up as a precaution'),
          apply: (s) => { adjustFitness(s, 8); return loc(s, 'Rien de grave détecté : tu repars rassuré. (+Forme)', 'Nothing serious detected: you come away reassured. (+Fitness)'); },
        },
        {
          label: loc(s, 'Ignorer et continuer comme si de rien n’était', 'Ignore it and carry on as if nothing happened'),
          apply: (s) => { adjustFitness(s, -6); return loc(s, 'Tu prends un risque calculé pour ne rien lâcher. (-Forme)', 'You take a calculated risk to keep pushing. (-Fitness)'); },
        },
      ],
    }),
  },
  {
    id: 'mid_season_leadership',
    minAge: 24,
    maxAge: 45,
    weight: () => 4,
    build: (s) => ({
      title: loc(s, 'Réunion de vestiaire', 'Locker room meeting'),
      text: loc(s, 'Le groupe traverse une période délicate et se tourne vers ses cadres pour recadrer les objectifs.', 'The squad is going through a rough patch and turns to its senior players to refocus on the goals.'),
      choices: [
        {
          label: loc(s, 'Prendre la parole devant le groupe', 'Speak up in front of the group'),
          apply: (s) => { adjustAttribute(s, 'mental', 2); adjustReputation(s, 2); return loc(s, 'Ton discours marque les esprits. (+Mental, +Réputation)', 'Your speech leaves a mark. (+Mental, +Reputation)'); },
        },
        {
          label: loc(s, 'Laisser les autres cadres gérer', 'Let the other senior players handle it'),
          apply: (s) => { adjustMorale(s, 3); return loc(s, 'Tu restes en retrait, sans pression supplémentaire. (+Moral)', 'You stay in the background, without extra pressure. (+Morale)'); },
        },
      ],
    }),
  },
  {
    id: 'mid_season_coach_change',
    minAge: 16,
    maxAge: 45,
    weight: (s) => (s.club ? 5 : 0),
    build: (s) => ({
      title: loc(s, "Changement d'entraîneur en pleine saison", 'Mid-season coaching change'),
      text: loc(
        s,
        "Sous la pression des résultats, le club limoge son entraîneur en plein cœur de saison. Un nouveau technicien débarque avec ses propres idées.",
        "Under pressure from poor results, the club sacks its coach in the middle of the season. A new manager arrives with his own ideas.",
      ),
      choices: [
        {
          label: loc(s, "S'adapter vite à ses méthodes", 'Quickly adapt to his methods'),
          apply: (s) => { adjustDiscipline(s, 3); adjustAttribute(s, 'vision', 1); return loc(s, 'Tu montres l’exemple en adoptant vite la nouvelle philosophie de jeu. (+Discipline, +Vision)', 'You lead by example, quickly adopting the new playing philosophy. (+Discipline, +Vision)'); },
        },
        {
          label: loc(s, "Défendre les méthodes de l'ancien coach", "Defend the former coach's methods"),
          apply: (s) => { adjustDiscipline(s, -5); return loc(s, 'Le nouveau staff note ta réticence au changement. (-Discipline)', 'The new staff notices your reluctance to change. (-Discipline)'); },
        },
        {
          label: loc(s, 'Rester neutre, attendre de voir', 'Stay neutral, wait and see'),
          apply: (s) => { adjustMorale(s, -3); return loc(s, "L'incertitude sur la nouvelle hiérarchie pèse un peu sur tout le vestiaire. (-Moral)", "Uncertainty about the new hierarchy weighs a little on the whole locker room. (-Morale)"); },
        },
      ],
    }),
  },
  {
    id: 'mid_season_teammate_injury',
    minAge: 18,
    maxAge: 45,
    weight: (s) => (s.club ? 5 : 0),
    build: (s) => ({
      title: loc(s, 'Blessure grave d’un cadre du vestiaire', 'Serious injury to a senior teammate'),
      text: loc(
        s,
        "Ton coéquipier le plus influent se blesse gravement à l'entraînement, bouleversant l'équilibre de toute l'équipe.",
        "Your most influential teammate suffers a serious injury in training, upending the whole team's balance.",
      ),
      choices: [
        {
          label: loc(s, 'Prendre les responsabilités en plus sur le terrain', 'Take on extra responsibility on the pitch'),
          apply: (s) => {
            if (nextChance(s, 0.5)) {
              adjustReputation(s, 5);
              adjustFitness(s, -8);
              return loc(s, 'Tu hausses le ton et deviens un cadre plus important aux yeux de tous. (+Réputation, -Forme)', 'You step up and become a more important figure in everyone’s eyes. (+Reputation, -Fitness)');
            }
            adjustFitness(s, -14);
            adjustMorale(s, -4);
            return loc(s, 'La charge de travail supplémentaire te pèse plus que prévu. (-Forme, -Moral)', 'The extra workload weighs on you more than expected. (-Fitness, -Morale)');
          },
        },
        {
          label: loc(s, 'Soutenir moralement le groupe', 'Support the group morally'),
          apply: (s) => { adjustMorale(s, 3); adjustAttribute(s, 'mental', 1); return loc(s, 'Ta solidarité resserre les liens du groupe dans un moment difficile. (+Moral, +Mental)', 'Your solidarity strengthens the group’s bond in a difficult moment. (+Morale, +Mental)'); },
        },
      ],
    }),
  },
  {
    id: 'mid_season_locker_clan_conflict',
    minAge: 18,
    maxAge: 45,
    weight: (s) => (s.club ? 5 : 0),
    build: (s) => ({
      title: loc(s, 'Conflit de clans dans le vestiaire', 'Clan conflict in the locker room'),
      text: loc(
        s,
        'Le vestiaire se scinde en deux clans rivaux : les nouvelles recrues internationales contre le noyau historique du club.',
        'The locker room splits into two rival factions: the new international signings against the club’s historic core.',
      ),
      choices: [
        {
          label: loc(s, 'Rester fidèle au noyau historique', 'Stay loyal to the historic core'),
          apply: (s) => { adjustDiscipline(s, 3); adjustReputation(s, -2); return loc(s, 'Les anciens du club apprécient ta loyauté, mais les nouvelles stars t’ignorent un peu plus. (+Discipline, -Réputation)', 'The club veterans appreciate your loyalty, but the new stars start ignoring you a bit more. (+Discipline, -Reputation)'); },
        },
        {
          label: loc(s, 'Se rapprocher des nouvelles recrues', 'Get closer to the new signings'),
          apply: (s) => { adjustReputation(s, 3); adjustDiscipline(s, -2); return loc(s, 'Le vestiaire international t’ouvre ses portes, au prix de quelques tensions avec les historiques. (+Réputation, -Discipline)', 'The international contingent opens its doors to you, at the cost of some tension with the veterans. (+Reputation, -Discipline)'); },
        },
        {
          label: loc(s, 'Jouer les médiateurs entre les deux clans', 'Play mediator between the two factions'),
          apply: (s) => {
            if (nextChance(s, 0.5)) {
              adjustReputation(s, 6);
              adjustMorale(s, 4);
              return loc(s, 'Ton rôle de trait d’union entre les deux camps est salué par tout le vestiaire. (+Réputation, +Moral)', 'Your role as a bridge between the two camps is praised by the whole locker room. (+Reputation, +Morale)');
            }
            adjustMorale(s, -5);
            return loc(s, 'Les deux camps te reprochent de ne pas avoir choisi ton clan. (-Moral)', 'Both camps resent you for not picking a side. (-Morale)');
          },
        },
      ],
    }),
  },
  {
    id: 'regular_match_attacker_moment',
    minAge: 16,
    maxAge: 45,
    weight: (s) => (s.club && (s.positionCode === 'ST' || s.positionCode === 'WI' || s.positionCode === 'AM') ? 11 : 0),
    build: (s) => {
      const minute = nextPick(s, MATCH_MINUTES);
      const minuteEn = MATCH_MINUTES_EN[MATCH_MINUTES.indexOf(minute)];
      return {
        title: loc(s, 'Occasion chaude en championnat', 'Big chance in the league'),
        text: loc(
          s,
          `${minute}, score serré lors d'un match de championnat. Un ballon repoussé par la défense adverse arrive droit sur toi, aux abords de la surface. Que fais-tu ?`,
          `${minuteEn}, close scoreline in a league match. A ball cleared by the opposing defense drops right to you, just outside the box. What do you do?`,
        ),
        choices: [
          {
            label: loc(s, 'Tirer au but — Sûr mais dangereux', 'Shoot — Safe but risky'),
            apply: (s2) => {
              const chance = clamp(0.35 + s2.attributes.tir / 220, 0.2, 0.7);
              if (nextChance(s2, chance)) {
                adjustReputation(s2, 4);
                adjustMorale(s2, 6);
                return loc(s2, 'BUT ! Ta frappe fait mouche et débloque la situation. (+Réputation, +Moral)', 'GOAL! Your strike finds the net and breaks the deadlock. (+Reputation, +Morale)');
              }
              adjustMorale(s2, -3);
              return loc(s2, "Ta frappe s'envole au-dessus de la barre. L'occasion est manquée. (-Moral)", 'Your shot sails over the bar. The chance is wasted. (-Morale)');
            },
          },
          {
            label: loc(s, 'Servir un coéquipier démarqué — Collectif', 'Set up an unmarked teammate — Team play'),
            apply: (s2) => {
              const chance = clamp(0.4 + s2.attributes.passe / 200 + s2.attributes.vision / 300, 0.2, 0.7);
              if (nextChance(s2, chance)) {
                adjustReputation(s2, 3);
                adjustMorale(s2, 4);
                return loc(s2, 'Passe décisive parfaite : ton coéquipier conclut sans difficulté. (+Réputation, +Moral)', 'A perfect assist: your teammate finishes with ease. (+Reputation, +Morale)');
              }
              adjustMorale(s2, -2);
              return loc(s2, 'La passe est trop appuyée, le coéquipier ne peut pas conclure. (-Moral)', "The pass is too heavy, your teammate can't convert. (-Morale)");
            },
          },
          {
            label: loc(s, 'Dribbler pour t’ouvrir l’angle — Technique risquée', 'Dribble to open up the angle — Risky skill move'),
            apply: (s2) => {
              const chance = clamp(0.3 + s2.attributes.technique / 230 + s2.attributes.vitesse / 300, 0.2, 0.7);
              if (nextChance(s2, chance)) {
                adjustReputation(s2, 6);
                adjustMorale(s2, 5);
                return loc(s2, 'Un crochet somptueux élimine le dernier défenseur avant la finition ! (+Réputation, +Moral)', 'A sublime step-over beats the last defender before you finish! (+Reputation, +Morale)');
              }
              adjustMorale(s2, -4);
              adjustDiscipline(s2, -1);
              return loc(s2, 'Le geste technique échoue, le ballon est repoussé de justesse. (-Moral)', 'The skill move fails, the ball is cleared just in time. (-Morale)');
            },
          },
          {
            label: loc(s, 'Tenter un geste spectaculaire — Showman', 'Attempt a spectacular move — Showman'),
            apply: (s2) => {
              const chance = clamp(0.18 + s2.attributes.mental / 260 + s2.attributes.technique / 280, 0.1, 0.5);
              if (nextChance(s2, chance)) {
                adjustReputation(s2, 10);
                adjustMorale(s2, 9);
                return loc(s2, 'Un geste rare qui électrise le stade et fait le tour des réseaux sociaux ! (+Réputation, +Moral)', 'A rare piece of magic that electrifies the stadium and goes viral! (+Reputation, +Morale)');
              }
              adjustReputation(s2, -3);
              adjustMorale(s2, -6);
              return loc(s2, "Le geste échoue lamentablement sous les sifflets. (-Réputation, -Moral)", 'The attempt fails miserably to a chorus of boos. (-Reputation, -Morale)');
            },
          },
        ],
      };
    },
  },
  {
    id: 'regular_match_midfielder_moment',
    minAge: 16,
    maxAge: 45,
    weight: (s) => (s.club && (s.positionCode === 'CM' || s.positionCode === 'DM') ? 11 : 0),
    build: (s) => {
      const minute = nextPick(s, MATCH_MINUTES);
      const minuteEn = MATCH_MINUTES_EN[MATCH_MINUTES.indexOf(minute)];
      return {
        title: loc(s, 'Instant décisif au milieu', 'Decisive moment in midfield'),
        text: loc(
          s,
          `${minute}, un ballon repoussé par la défense adverse arrive à toi, à 25 mètres des buts, lors d'un match serré.`,
          `${minuteEn}, a ball cleared by the opposing defense drops to you, 25 meters from goal, in a tight match.`,
        ),
        choices: [
          {
            label: loc(s, 'Frapper une praline lointaine — Sûr mais dangereux', 'Hit a long-range screamer — Safe but risky'),
            apply: (s2) => {
              const chance = clamp(0.3 + s2.attributes.tir / 240 + s2.attributes.technique / 300, 0.2, 0.7);
              if (nextChance(s2, chance)) {
                adjustReputation(s2, 6);
                adjustMorale(s2, 6);
                return loc(s2, 'Une frappe surpuissante trouve la lucarne ! (+Réputation, +Moral)', 'A thunderous strike finds the top corner! (+Reputation, +Morale)');
              }
              adjustMorale(s2, -3);
              return loc(s2, "Le tir part loin au-dessus de la transversale. (-Moral)", 'The shot flies well over the crossbar. (-Morale)');
            },
          },
          {
            label: loc(s, 'Chercher la passe millimétrée — Collectif', 'Look for the pinpoint pass — Team play'),
            apply: (s2) => {
              const chance = clamp(0.4 + s2.attributes.passe / 200 + s2.attributes.vision / 260, 0.2, 0.7);
              if (nextChance(s2, chance)) {
                adjustReputation(s2, 4);
                adjustMorale(s2, 5);
                return loc(s2, 'Une ouverture chirurgicale libère un coéquipier en position idéale. (+Réputation, +Moral)', 'A surgical through-ball frees a teammate in an ideal position. (+Reputation, +Morale)');
              }
              adjustMorale(s2, -2);
              return loc(s2, "La passe est coupée par un défenseur vigilant. (-Moral)", 'The pass is intercepted by an alert defender. (-Morale)');
            },
          },
          {
            label: loc(s, 'Percuter balle au pied vers la surface — Technique risquée', 'Drive forward with the ball toward the box — Risky skill move'),
            apply: (s2) => {
              const chance = clamp(0.28 + s2.attributes.technique / 230 + s2.attributes.vitesse / 280, 0.2, 0.7);
              if (nextChance(s2, chance)) {
                adjustReputation(s2, 5);
                adjustMorale(s2, 5);
                return loc(s2, "Une percée qui affole toute la défense adverse ! (+Réputation, +Moral)", 'A driving run that throws the entire opposing defense into panic! (+Reputation, +Morale)');
              }
              adjustDiscipline(s2, -1);
              adjustMorale(s2, -4);
              return loc(s2, 'Tu perds le ballon dans le pressing adverse. (-Moral)', "You lose the ball under the opposition's pressing. (-Morale)");
            },
          },
        ],
      };
    },
  },
  {
    id: 'regular_match_defender_moment',
    minAge: 16,
    maxAge: 45,
    weight: (s) => (s.club && (s.positionCode === 'CB' || s.positionCode === 'FB') ? 11 : 0),
    build: (s) => {
      const minute = nextPick(s, MATCH_MINUTES);
      const minuteEn = MATCH_MINUTES_EN[MATCH_MINUTES.indexOf(minute)];
      return {
        title: loc(s, 'Alerte défensive', 'Defensive alarm'),
        text: loc(
          s,
          `${minute}, un attaquant adverse s'échappe seul face à ton gardien. Si tu ne réagis pas, ton équipe encaisse un but important.`,
          `${minuteEn}, an opposing striker breaks clean through, one-on-one with your goalkeeper. If you don't react, your team concedes a crucial goal.`,
        ),
        choices: [
          {
            label: loc(s, 'Tacle glissé décisif — Osé, risque de carton', 'Decisive sliding tackle — Bold, risk of a card'),
            apply: (s2) => {
              const chance = clamp(0.35 + s2.attributes.defense / 220, 0.2, 0.7);
              if (nextChance(s2, chance)) {
                adjustReputation(s2, 5);
                adjustMorale(s2, 6);
                return loc(s2, 'Un tacle chirurgical, ballon récupéré proprement ! (+Réputation, +Moral)', 'A surgical tackle, the ball cleanly won! (+Reputation, +Morale)');
              }
              adjustDiscipline(s2, -3);
              adjustReputation(s2, -3);
              adjustMorale(s2, -4);
              return loc(s2, 'Le tacle est raté : penalty et carton contre toi. (-Réputation, -Discipline, -Moral)', 'The tackle misses: penalty and a card against you. (-Reputation, -Discipline, -Morale)');
            },
          },
          {
            label: loc(s, 'Contester sans faute — Sûr', 'Contain without fouling — Safe'),
            apply: (s2) => {
              const chance = clamp(0.3 + s2.attributes.defense / 260 + s2.attributes.vitesse / 320, 0.2, 0.7);
              if (nextChance(s2, chance)) {
                adjustReputation(s2, 4);
                adjustMorale(s2, 4);
                return loc(s2, "Un repli propre : l'attaquant perd ses appuis. (+Réputation, +Moral)", 'A clean recovery run: the striker loses his footing. (+Reputation, +Morale)');
              }
              adjustMorale(s2, -3);
              return loc(s2, "L'attaquant se joue de toi et ouvre le score. (-Moral)", 'The striker skips past you and opens the scoring. (-Morale)');
            },
          },
          {
            label: loc(s, 'Le pousser hors du jeu — Antijeu, faute assumée', 'Push him out of play — Cynical, deliberate foul'),
            apply: (s2) => {
              adjustDiscipline(s2, -4);
              if (nextChance(s2, 0.55)) {
                adjustReputation(s2, 1);
                return loc(s2, "Une faute cynique mais efficace : l'action est cassée. (-Discipline)", 'A cynical but effective foul: the attack is broken up. (-Discipline)');
              }
              adjustReputation(s2, -5);
              adjustMorale(s2, -5);
              return loc(s2, "L'arbitre ne s'y trompe pas : penalty et carton. (-Réputation, -Discipline, -Moral)", "The referee isn't fooled: penalty and a card. (-Reputation, -Discipline, -Morale)");
            },
          },
        ],
      };
    },
  },
  {
    id: 'regular_match_goalkeeper_penalty',
    minAge: 16,
    maxAge: 45,
    weight: (s) => (s.club && s.positionCode === 'GK' ? 11 : 0),
    build: (s) => {
      const minute = nextPick(s, MATCH_MINUTES);
      const minuteEn = MATCH_MINUTES_EN[MATCH_MINUTES.indexOf(minute)];
      return {
        title: loc(s, 'Penalty à arrêter', 'A penalty to save'),
        text: loc(
          s,
          `${minute}, penalty accordé à l'adversaire pour une faute litigieuse. Le tireur s'avance, tout le stade retient son souffle : que fais-tu ?`,
          `${minuteEn}, a penalty is awarded to the opposition for a contentious foul. The taker steps up, the whole stadium holds its breath: what do you do?`,
        ),
        choices: [
          {
            label: loc(s, 'Plonger du bon côté d’instinct — Sûr', 'Dive the right way on instinct — Safe'),
            apply: (s2) => {
              const chance = clamp(0.3 + s2.attributes.reflexes / 220 + s2.attributes.mental / 320, 0.2, 0.7);
              if (nextChance(s2, chance)) {
                adjustReputation(s2, 6);
                adjustMorale(s2, 7);
                return loc(s2, 'ARRÊT ! Tu détends parfaitement du bon côté et sauves un point précieux. (+Réputation, +Moral)', 'SAVE! You spring perfectly to the right side and rescue a precious point. (+Reputation, +Morale)');
              }
              adjustMorale(s2, -3);
              return loc(s2, 'Le tir part du bon côté, mais trop précis. (-Moral)', 'You guess the right side, but the shot is too well placed. (-Morale)');
            },
          },
          {
            label: loc(s, 'Chambrer le tireur avant qu’il ne frappe — Intimidation, showman', 'Taunt the taker before he strikes — Intimidation, showman'),
            apply: (s2) => {
              const chance = clamp(0.2 + s2.attributes.mental / 240, 0.12, 0.55);
              if (nextChance(s2, chance)) {
                adjustReputation(s2, 9);
                adjustMorale(s2, 8);
                return loc(s2, "Ta mise en scène déstabilise le tireur, qui manque sa frappe. Moment d'anthologie ! (+Réputation, +Moral)", 'Your theatrics rattle the taker, who fluffs his shot. An iconic moment! (+Reputation, +Morale)');
              }
              adjustReputation(s2, -3);
              adjustMorale(s2, -5);
              return loc(s2, 'Le tireur ignore ta provocation et ajuste calmement. (-Réputation, -Moral)', 'The taker ignores your provocation and calmly slots it home. (-Reputation, -Morale)');
            },
          },
          {
            label: loc(s, 'Rester campé au centre et anticiper — Technique', 'Stand your ground in the center and read it — Technique'),
            apply: (s2) => {
              const chance = clamp(0.25 + s2.attributes.reflexes / 260 + s2.attributes.technique / 340, 0.18, 0.6);
              if (nextChance(s2, chance)) {
                adjustReputation(s2, 5);
                adjustMorale(s2, 6);
                return loc(s2, 'Ta position parfaite t’évite de plonger : le ballon vient droit sur toi. (+Réputation, +Moral)', "Your perfect positioning means you don't even need to dive: the ball comes straight to you. (+Reputation, +Morale)");
              }
              adjustMorale(s2, -3);
              return loc(s2, 'Le tireur place son ballon dans la seule zone que tu ne couvrais pas. (-Moral)', "The taker places it in the one spot you weren't covering. (-Morale)");
            },
          },
        ],
      };
    },
  },
];

export function rollMidSeasonEvent(
  state: PlayerState,
): { template: EventTemplate; title: string; text: string; choices: EventChoiceOutcome[] } {
  const candidates = MID_SEASON_EVENTS.filter((e) => state.age >= e.minAge && state.age <= e.maxAge);
  const pool = candidates.length > 0 ? candidates : MID_SEASON_EVENTS;
  const total = pool.reduce((sum, e) => sum + e.weight(state, 'B'), 0);
  let r = (nextInt(state, 0, 1_000_000) / 1_000_000) * total;
  let chosen = pool[pool.length - 1];
  for (const cand of pool) {
    r -= cand.weight(state, 'B');
    if (r <= 0) { chosen = cand; break; }
  }
  const rng = rngFromCarrier(state);
  const built = chosen.build(state, rng);
  return { template: chosen, title: built.title, text: built.text, choices: built.choices };
}
