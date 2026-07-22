// Grands moments de match : lors d'une finale de coupe nationale, le joueur affronte un choix
// décisif en toute fin de rencontre. Les options dépendent de son poste et affichent chacune un
// "atout" (Collectif, Sûr mais risqué, Showman/Légendaire...) qui en résume le style et le risque.
import type { EventTemplate } from './events';
import type { PlayerState } from '../engine/types';
import type { Rng } from '../engine/rng';
import { nextChance, rngFromCarrier } from '../engine/rng';
import { adjustDiscipline, adjustFitness, adjustMorale, adjustReputation, clamp, loc } from '../engine/util';
import { hasLeagueSystem, pickClubFromDivision } from './leagues';
import { pickRealClub } from './realClubs';
import { domesticCupName } from './cups';

function pickRivalClub(state: PlayerState, rng: Rng): string {
  const club = state.club!;
  const avoid = [club.name, ...state.seenClubNames];
  if (club.divisionLevel && hasLeagueSystem(club.countryCode)) {
    return pickClubFromDivision(club.countryCode, club.divisionLevel, rng, avoid);
  }
  return pickRealClub(club.countryCode, club.tierIndex, rng, avoid);
}

function matchHeader(state: PlayerState): { title: string; cup: string; clubName: string } {
  const club = state.club!;
  const cup = domesticCupName(state.countryCode, state.language);
  const rival = pickRivalClub(state, rngFromCarrier(state));
  const title = loc(state, `${club.name} – ${rival} (finale de ${cup})`, `${club.name} – ${rival} (${cup} final)`);
  return { title, cup, clubName: club.name };
}

export const MATCH_MOMENT_EVENTS: EventTemplate[] = [
  // ---------------- Attaquants / ailiers / milieux offensifs ----------------
  {
    id: 'cup_final_attacker_moment',
    minAge: 16,
    maxAge: 45,
    weight: (s) => (s.club && (s.positionCode === 'ST' || s.positionCode === 'WI' || s.positionCode === 'AM') ? 6 : 0),
    build: (s) => {
      const { title, cup, clubName } = matchHeader(s);
      const isExtraTime = nextChance(s, 0.5);
      const minute = isExtraTime ? '118e minute' : '90e+3';
      const minuteEn = isExtraTime ? '118th minute' : '90+3';
      return {
        title,
        text: loc(
          s,
          `${minute}, score à égalité. Un ballon mal repoussé par la défense adverse arrive droit sur toi, seul face au but. Tout le stade retient son souffle : que fais-tu ?`,
          `${minuteEn}, scores level. A poorly cleared ball from the opposing defense drops right to you, one-on-one with the goalkeeper. The whole stadium holds its breath: what do you do?`,
        ),
        choices: [
          {
            label: loc(s, 'Tirer au but — Sûr mais dangereux', 'Shoot — Safe but risky'),
            apply: (s2) => {
              const chance = clamp(0.35 + s2.attributes.tir / 220, 0.25, 0.75);
              if (nextChance(s2, chance)) {
                s2.trophies.push(loc(s2, `${cup} — saison ${s2.season} (${clubName})`, `${cup} — season ${s2.season} (${clubName})`));
                adjustReputation(s2, 10);
                adjustMorale(s2, 12);
                return loc(s2, `BUT ! Ta frappe s'envole dans la lucarne : ${clubName} remporte la ${cup} ! (+Réputation, +Moral)`, `GOAL! Your shot flies into the top corner: ${clubName} wins the ${cup}! (+Reputation, +Morale)`);
              }
              adjustMorale(s2, -6);
              return loc(s2, `Ta frappe s'envole au-dessus de la barre... la finale échappe à ${clubName}. (-Moral)`, `Your shot sails over the bar... the final slips away from ${clubName}. (-Morale)`);
            },
          },
          {
            label: loc(s, 'Servir un coéquipier démarqué — Collectif', 'Set up an unmarked teammate — Team play'),
            apply: (s2) => {
              const chance = clamp(0.4 + s2.attributes.passe / 200 + s2.attributes.vision / 300, 0.3, 0.8);
              if (nextChance(s2, chance)) {
                s2.trophies.push(loc(s2, `${cup} — saison ${s2.season} (${clubName})`, `${cup} — season ${s2.season} (${clubName})`));
                adjustReputation(s2, 6);
                adjustMorale(s2, 8);
                return loc(s2, `Une passe décisive parfaite : ton coéquipier n'a plus qu'à conclure. ${clubName} soulève la ${cup} ! (+Réputation, +Moral)`, `A perfect assist: your teammate only has to finish it off. ${clubName} lifts the ${cup}! (+Reputation, +Morale)`);
              }
              adjustMorale(s2, -3);
              return loc(s2, 'La passe est trop appuyée, l’occasion est manquée. La finale se jouera aux tirs au but... et ton équipe s’incline. (-Moral)', 'The pass is too heavy, the chance is wasted. The final goes to a penalty shootout... and your team loses. (-Morale)');
            },
          },
          {
            label: loc(s, 'Dribbler pour t’ouvrir l’angle — Technique risquée', 'Dribble to open up the angle — Risky skill move'),
            apply: (s2) => {
              const chance = clamp(0.3 + s2.attributes.technique / 230 + s2.attributes.vitesse / 300, 0.2, 0.7);
              if (nextChance(s2, chance)) {
                s2.trophies.push(loc(s2, `${cup} — saison ${s2.season} (${clubName})`, `${cup} — season ${s2.season} (${clubName})`));
                adjustReputation(s2, 12);
                adjustMorale(s2, 10);
                return loc(s2, `Un crochet somptueux élimine le dernier défenseur avant une finition du plat du pied ! ${clubName} est sacré en ${cup} ! (+Réputation, +Moral)`, `A sublime step-over beats the last defender before a calm finish! ${clubName} is crowned champion of the ${cup}! (+Reputation, +Morale)`);
              }
              adjustMorale(s2, -8);
              adjustDiscipline(s2, -2);
              if (nextChance(s2, 0.3)) {
                adjustFitness(s2, -10);
                return loc(s2, 'Le tacle désespéré du défenseur te fauche net : occasion manquée et douleur au passage. (-Moral, -Forme)', "The defender's desperate tackle scythes you down: chance wasted, and pain along with it. (-Morale, -Fitness)");
              }
              return loc(s2, 'Le geste technique échoue, le ballon est repoussé de justesse. La finale bascule dans l’autre sens. (-Moral)', 'The skill move fails, the ball is cleared just in time. The final swings the other way. (-Morale)');
            },
          },
          {
            label: loc(s, 'Tenter la Panenka — Showman, geste légendaire', 'Attempt a Panenka — Showman, legendary move'),
            apply: (s2) => {
              const chance = clamp(0.18 + s2.attributes.mental / 260 + s2.attributes.technique / 280, 0.1, 0.55);
              if (nextChance(s2, chance)) {
                s2.trophies.push(loc(s2, `${cup} — saison ${s2.season} (${clubName})`, `${cup} — season ${s2.season} (${clubName})`));
                s2.majorAwards.push(loc(s2, `Geste légendaire en finale de ${cup} — saison ${s2.season}`, `Legendary move in the ${cup} final — season ${s2.season}`));
                adjustReputation(s2, 20);
                adjustMorale(s2, 18);
                return loc(s2, `PANENKA ! Un sang-froid total : le ballon se love au fond des filets sous les yeux médusés du gardien. Un geste qui restera dans les mémoires. ${clubName} est sacré ! (+Réputation, +Moral)`, `PANENKA! Total composure: the ball nestles into the net under the goalkeeper's stunned gaze. A moment that will be remembered forever. ${clubName} is crowned champion! (+Reputation, +Morale)`);
              }
              adjustReputation(s2, -8);
              adjustMorale(s2, -14);
              return loc(s2, `La Panenka est lue par le gardien, un fiasco total sous les yeux de tout le pays. ${clubName} perd la finale par ta faute. (-Réputation, -Moral)`, `The goalkeeper reads the Panenka perfectly, a total fiasco in front of the whole country. ${clubName} loses the final because of you. (-Reputation, -Morale)`);
            },
          },
        ],
      };
    },
  },

  // ---------------- Milieux de terrain (relayeurs / sentinelles) ----------------
  {
    id: 'cup_final_midfielder_moment',
    minAge: 16,
    maxAge: 45,
    weight: (s) => (s.club && (s.positionCode === 'CM' || s.positionCode === 'DM') ? 6 : 0),
    build: (s) => {
      const { title, cup, clubName } = matchHeader(s);
      return {
        title,
        text: loc(
          s,
          '90e+2, un ballon repoussé par la défense arrive à toi, à 25 mètres des buts. Le stade entier retient son souffle en attendant ta décision.',
          '90+2, a ball cleared by the defense drops to you, 25 meters from goal. The entire stadium holds its breath waiting for your decision.',
        ),
        choices: [
          {
            label: loc(s, 'Frapper une praline lointaine — Sûr mais dangereux', 'Hit a long-range screamer — Safe but risky'),
            apply: (s2) => {
              const chance = clamp(0.3 + s2.attributes.tir / 240 + s2.attributes.technique / 300, 0.2, 0.65);
              if (nextChance(s2, chance)) {
                s2.trophies.push(loc(s2, `${cup} — saison ${s2.season} (${clubName})`, `${cup} — season ${s2.season} (${clubName})`));
                adjustReputation(s2, 14);
                adjustMorale(s2, 12);
                return loc(s2, `Une frappe surpuissante trouve la lucarne opposée ! ${clubName} remporte la ${cup} sur un exploit individuel ! (+Réputation, +Moral)`, `A thunderous strike finds the far top corner! ${clubName} wins the ${cup} on a moment of individual brilliance! (+Reputation, +Morale)`);
              }
              adjustMorale(s2, -6);
              return loc(s2, 'Le tir part loin au-dessus de la transversale. L’occasion est gâchée. (-Moral)', 'The shot flies well over the crossbar. The chance is squandered. (-Morale)');
            },
          },
          {
            label: loc(s, 'Chercher la passe millimétrée — Collectif', 'Look for the pinpoint pass — Team play'),
            apply: (s2) => {
              const chance = clamp(0.4 + s2.attributes.passe / 200 + s2.attributes.vision / 260, 0.3, 0.8);
              if (nextChance(s2, chance)) {
                s2.trophies.push(loc(s2, `${cup} — saison ${s2.season} (${clubName})`, `${cup} — season ${s2.season} (${clubName})`));
                adjustReputation(s2, 8);
                adjustMorale(s2, 9);
                return loc(s2, `Une ouverture chirurgicale libère un coéquipier en position idéale. ${clubName} est sacré en ${cup} ! (+Réputation, +Moral)`, `A surgical through-ball frees a teammate in an ideal position. ${clubName} is crowned champion of the ${cup}! (+Reputation, +Morale)`);
              }
              adjustMorale(s2, -3);
              return loc(s2, 'La passe est coupée par un défenseur vigilant. L’occasion s’envole. (-Moral)', 'The pass is intercepted by an alert defender. The chance disappears. (-Morale)');
            },
          },
          {
            label: loc(s, 'Percuter balle au pied vers la surface — Technique risquée', 'Drive forward with the ball toward the box — Risky skill move'),
            apply: (s2) => {
              const chance = clamp(0.28 + s2.attributes.technique / 230 + s2.attributes.vitesse / 280, 0.2, 0.65);
              if (nextChance(s2, chance)) {
                s2.trophies.push(loc(s2, `${cup} — saison ${s2.season} (${clubName})`, `${cup} — season ${s2.season} (${clubName})`));
                adjustReputation(s2, 11);
                adjustMorale(s2, 10);
                return loc(s2, `Une percée solitaire venue du milieu de terrain qui affole toute la défense ! ${clubName} soulève la ${cup} ! (+Réputation, +Moral)`, `A solo run from midfield that throws the entire defense into chaos! ${clubName} lifts the ${cup}! (+Reputation, +Morale)`);
              }
              adjustDiscipline(s2, -2);
              adjustMorale(s2, -7);
              return loc(s2, 'Tu perds le ballon dans le pressing adverse. Une contre-attaque manque même de coûter la finale. (-Moral)', "You lose the ball under the opposition's pressing. A counter-attack nearly costs you the final. (-Morale)");
            },
          },
        ],
      };
    },
  },

  // ---------------- Défenseurs centraux / latéraux ----------------
  {
    id: 'cup_final_defender_moment',
    minAge: 16,
    maxAge: 45,
    weight: (s) => (s.club && (s.positionCode === 'CB' || s.positionCode === 'FB') ? 6 : 0),
    build: (s) => {
      const { title, cup, clubName } = matchHeader(s);
      return {
        title,
        text: loc(
          s,
          `90e+4, un attaquant adverse s'échappe seul face à ton gardien. Si tu ne réagis pas, la ${cup} vous échappe définitivement.`,
          `90+4, an opposing striker breaks clean through, one-on-one with your goalkeeper. If you don't react, the ${cup} slips away for good.`,
        ),
        choices: [
          {
            label: loc(s, 'Tacle glissé décisif — Osé, risque de carton', 'Decisive sliding tackle — Bold, risk of a card'),
            apply: (s2) => {
              const chance = clamp(0.35 + s2.attributes.defense / 220, 0.25, 0.75);
              if (nextChance(s2, chance)) {
                s2.trophies.push(loc(s2, `${cup} — saison ${s2.season} (${clubName})`, `${cup} — season ${s2.season} (${clubName})`));
                adjustReputation(s2, 12);
                adjustMorale(s2, 12);
                return loc(s2, `Un tacle chirurgical, ballon récupéré proprement ! ${clubName} tient bon et remporte la ${cup} ! (+Réputation, +Moral)`, `A surgical tackle, the ball cleanly won! ${clubName} holds firm and wins the ${cup}! (+Reputation, +Morale)`);
              }
              adjustDiscipline(s2, -6);
              adjustReputation(s2, -6);
              adjustMorale(s2, -8);
              return loc(s2, `Le tacle est raté : penalty et carton contre toi. ${clubName} perd la finale par ta faute. (-Réputation, -Discipline, -Moral)`, `The tackle misses: penalty and a card against you. ${clubName} loses the final because of you. (-Reputation, -Discipline, -Morale)`);
            },
          },
          {
            label: loc(s, 'Contester sans faute — Sûr', 'Contain without fouling — Safe'),
            apply: (s2) => {
              const chance = clamp(0.3 + s2.attributes.defense / 260 + s2.attributes.vitesse / 320, 0.2, 0.65);
              if (nextChance(s2, chance)) {
                s2.trophies.push(loc(s2, `${cup} — saison ${s2.season} (${clubName})`, `${cup} — season ${s2.season} (${clubName})`));
                adjustReputation(s2, 8);
                adjustMorale(s2, 8);
                return loc(s2, `Un repli propre et une contestation intelligente du ballon : l'attaquant perd ses appuis. ${clubName} est sacré en ${cup} ! (+Réputation, +Moral)`, `A clean recovery run and smart positioning: the striker loses his footing. ${clubName} is crowned champion of the ${cup}! (+Reputation, +Morale)`);
              }
              adjustMorale(s2, -6);
              return loc(s2, 'Malgré une contestation sage, l’attaquant se joue de toi et ouvre le score. La finale échappe à ton équipe. (-Moral)', 'Despite a sensible approach, the striker skips past you and opens the scoring. The final slips away from your team. (-Morale)');
            },
          },
          {
            label: loc(s, 'Le pousser hors du jeu — Antijeu, faute assumée', 'Push him out of play — Cynical, deliberate foul'),
            apply: (s2) => {
              adjustDiscipline(s2, -8);
              if (nextChance(s2, 0.55)) {
                s2.trophies.push(loc(s2, `${cup} — saison ${s2.season} (${clubName})`, `${cup} — season ${s2.season} (${clubName})`));
                adjustReputation(s2, 2);
                return loc(s2, `Une faute cynique mais efficace : l'action est cassée. ${clubName} s'impose finalement en ${cup}, non sans un carton pour toi. (-Discipline)`, `A cynical but effective foul: the attack is broken up. ${clubName} ultimately wins the ${cup}, though not without a card for you. (-Discipline)`);
              }
              adjustReputation(s2, -10);
              adjustMorale(s2, -10);
              return loc(s2, `L'arbitre ne s'y trompe pas : penalty et carton rouge. ${clubName} perd la finale à dix contre onze. (-Réputation, -Discipline, -Moral)`, `The referee isn't fooled: penalty and a red card. ${clubName} loses the final down to ten men. (-Reputation, -Discipline, -Morale)`);
            },
          },
        ],
      };
    },
  },

  // ---------------- Gardiens de but ----------------
  {
    id: 'cup_final_goalkeeper_moment',
    minAge: 16,
    maxAge: 45,
    weight: (s) => (s.club && s.positionCode === 'GK' ? 6 : 0),
    build: (s) => {
      const { title, cup, clubName } = matchHeader(s);
      return {
        title,
        text: loc(
          s,
          'Séance de tirs au but, sixième tentative. Le tireur adverse s’avance, la balle et tout le poids de la finale reposent sur toi.',
          'Penalty shootout, sixth attempt. The opposing taker steps up, the ball and the whole weight of the final rest on your shoulders.',
        ),
        choices: [
          {
            label: loc(s, 'Lire le tireur et plonger du bon côté — Sûr', 'Read the taker and dive the right way — Safe'),
            apply: (s2) => {
              const chance = clamp(0.3 + s2.attributes.reflexes / 220 + s2.attributes.mental / 320, 0.2, 0.7);
              if (nextChance(s2, chance)) {
                s2.trophies.push(loc(s2, `${cup} — saison ${s2.season} (${clubName})`, `${cup} — season ${s2.season} (${clubName})`));
                adjustReputation(s2, 14);
                adjustMorale(s2, 14);
                return loc(s2, `ARRÊT DÉCISIF ! Tu détends parfaitement le bon côté. ${clubName} remporte la ${cup} aux tirs au but ! (+Réputation, +Moral)`, `DECISIVE SAVE! You spring perfectly to the right side. ${clubName} wins the ${cup} on penalties! (+Reputation, +Morale)`);
              }
              adjustMorale(s2, -6);
              return loc(s2, `Le tir part du bon côté, mais trop puissant et trop précis. La ${cup} échappe à ton équipe. (-Moral)`, `You guess the right side, but the shot is too powerful and too precise. The ${cup} slips away from your team. (-Morale)`);
            },
          },
          {
            label: loc(s, 'Chambrer le tireur avant qu’il ne frappe — Intimidation, showman', 'Taunt the taker before he strikes — Intimidation, showman'),
            apply: (s2) => {
              const chance = clamp(0.2 + s2.attributes.mental / 240, 0.12, 0.6);
              if (nextChance(s2, chance)) {
                s2.trophies.push(loc(s2, `${cup} — saison ${s2.season} (${clubName})`, `${cup} — season ${s2.season} (${clubName})`));
                s2.majorAwards.push(loc(s2, `Héros des tirs au but en finale de ${cup} — saison ${s2.season}`, `Penalty-shootout hero in the ${cup} final — season ${s2.season}`));
                adjustReputation(s2, 20);
                adjustMorale(s2, 16);
                return loc(s2, `Ta mise en scène déstabilise totalement le tireur, qui s'écroule sur ton arrêt. Un moment d'anthologie ! ${clubName} est sacré en ${cup} ! (+Réputation, +Moral)`, `Your theatrics completely rattle the taker, who crumbles as you make the save. An iconic moment! ${clubName} is crowned champion of the ${cup}! (+Reputation, +Morale)`);
              }
              adjustReputation(s2, -6);
              adjustMorale(s2, -10);
              return loc(s2, `Le tireur ignore royalement ta provocation et ajuste calmement le petit filet. ${clubName} perd la finale. (-Réputation, -Moral)`, `The taker royally ignores your provocation and calmly slots it into the side netting. ${clubName} loses the final. (-Reputation, -Morale)`);
            },
          },
          {
            label: loc(s, 'Rester campé au centre et anticiper — Technique', 'Stand your ground in the center and read it — Technique'),
            apply: (s2) => {
              const chance = clamp(0.25 + s2.attributes.reflexes / 260 + s2.attributes.technique / 340, 0.18, 0.6);
              if (nextChance(s2, chance)) {
                s2.trophies.push(loc(s2, `${cup} — saison ${s2.season} (${clubName})`, `${cup} — season ${s2.season} (${clubName})`));
                adjustReputation(s2, 10);
                adjustMorale(s2, 10);
                return loc(s2, `Ta position parfaite t'évite d'avoir à plonger : le ballon vient droit sur toi. ${clubName} remporte la ${cup} ! (+Réputation, +Moral)`, `Your perfect positioning means you don't even need to dive: the ball comes straight to you. ${clubName} wins the ${cup}! (+Reputation, +Morale)`);
              }
              adjustMorale(s2, -5);
              return loc(s2, 'Le tireur place son ballon dans la seule zone que tu ne couvrais pas. La finale bascule dans l’autre sens. (-Moral)', "The taker places it in the one spot you weren't covering. The final swings the other way. (-Morale)");
            },
          },
        ],
      };
    },
  },
];
