// Grands moments de match : lors d'une finale de coupe nationale, le joueur affronte un choix
// décisif en toute fin de rencontre. Les options dépendent de son poste et affichent chacune un
// "atout" (Collectif, Sûr mais risqué, Showman/Légendaire...) qui en résume le style et le risque.
import type { EventTemplate } from './events';
import type { PlayerState } from '../engine/types';
import type { Rng } from '../engine/rng';
import { nextChance, rngFromCarrier } from '../engine/rng';
import { adjustDiscipline, adjustFitness, adjustMorale, adjustReputation, clamp } from '../engine/util';
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
  const cup = domesticCupName(state.countryCode);
  const rival = pickRivalClub(state, rngFromCarrier(state));
  return { title: `${club.name} – ${rival} (finale de ${cup})`, cup, clubName: club.name };
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
      const minute = nextChance(s, 0.5) ? '118e minute' : '90e+3';
      return {
        title,
        text: `${minute}, score à égalité. Un ballon mal repoussé par la défense adverse arrive droit sur toi, seul face au but. Tout le stade retient son souffle : que fais-tu ?`,
        choices: [
          {
            label: 'Tirer au but — Sûr mais dangereux',
            apply: (s2) => {
              const chance = clamp(0.35 + s2.attributes.tir / 220, 0.25, 0.75);
              if (nextChance(s2, chance)) {
                s2.trophies.push(`${cup} — saison ${s2.season} (${clubName})`);
                adjustReputation(s2, 10);
                adjustMorale(s2, 12);
                return `BUT ! Ta frappe s'envole dans la lucarne : ${clubName} remporte la ${cup} ! (+Réputation, +Moral)`;
              }
              adjustMorale(s2, -6);
              return `Ta frappe s'envole au-dessus de la barre... la finale échappe à ${clubName}. (-Moral)`;
            },
          },
          {
            label: 'Servir un coéquipier démarqué — Collectif',
            apply: (s2) => {
              const chance = clamp(0.4 + s2.attributes.passe / 200 + s2.attributes.vision / 300, 0.3, 0.8);
              if (nextChance(s2, chance)) {
                s2.trophies.push(`${cup} — saison ${s2.season} (${clubName})`);
                adjustReputation(s2, 6);
                adjustMorale(s2, 8);
                return `Une passe décisive parfaite : ton coéquipier n'a plus qu'à conclure. ${clubName} soulève la ${cup} ! (+Réputation, +Moral)`;
              }
              adjustMorale(s2, -3);
              return 'La passe est trop appuyée, l’occasion est manquée. La finale se jouera aux tirs au but... et ton équipe s’incline. (-Moral)';
            },
          },
          {
            label: 'Dribbler pour t’ouvrir l’angle — Technique risquée',
            apply: (s2) => {
              const chance = clamp(0.3 + s2.attributes.technique / 230 + s2.attributes.vitesse / 300, 0.2, 0.7);
              if (nextChance(s2, chance)) {
                s2.trophies.push(`${cup} — saison ${s2.season} (${clubName})`);
                adjustReputation(s2, 12);
                adjustMorale(s2, 10);
                return `Un crochet somptueux élimine le dernier défenseur avant une finition du plat du pied ! ${clubName} est sacré en ${cup} ! (+Réputation, +Moral)`;
              }
              adjustMorale(s2, -8);
              adjustDiscipline(s2, -2);
              if (nextChance(s2, 0.3)) {
                adjustFitness(s2, -10);
                return 'Le tacle désespéré du défenseur te fauche net : occasion manquée et douleur au passage. (-Moral, -Forme)';
              }
              return 'Le geste technique échoue, le ballon est repoussé de justesse. La finale bascule dans l’autre sens. (-Moral)';
            },
          },
          {
            label: 'Tenter la Panenka — Showman, geste légendaire',
            apply: (s2) => {
              const chance = clamp(0.18 + s2.attributes.mental / 260 + s2.attributes.technique / 280, 0.1, 0.55);
              if (nextChance(s2, chance)) {
                s2.trophies.push(`${cup} — saison ${s2.season} (${clubName})`);
                s2.majorAwards.push(`Geste légendaire en finale de ${cup} — saison ${s2.season}`);
                adjustReputation(s2, 20);
                adjustMorale(s2, 18);
                return `PANENKA ! Un sang-froid total : le ballon se love au fond des filets sous les yeux médusés du gardien. Un geste qui restera dans les mémoires. ${clubName} est sacré ! (+Réputation, +Moral)`;
              }
              adjustReputation(s2, -8);
              adjustMorale(s2, -14);
              return `La Panenka est lue par le gardien, un fiasco total sous les yeux de tout le pays. ${clubName} perd la finale par ta faute. (-Réputation, -Moral)`;
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
        text: '90e+2, un ballon repoussé par la défense arrive à toi, à 25 mètres des buts. Le stade entier retient son souffle en attendant ta décision.',
        choices: [
          {
            label: 'Frapper une praline lointaine — Sûr mais dangereux',
            apply: (s2) => {
              const chance = clamp(0.3 + s2.attributes.tir / 240 + s2.attributes.technique / 300, 0.2, 0.65);
              if (nextChance(s2, chance)) {
                s2.trophies.push(`${cup} — saison ${s2.season} (${clubName})`);
                adjustReputation(s2, 14);
                adjustMorale(s2, 12);
                return `Une frappe surpuissante trouve la lucarne opposée ! ${clubName} remporte la ${cup} sur un exploit individuel ! (+Réputation, +Moral)`;
              }
              adjustMorale(s2, -6);
              return 'Le tir part loin au-dessus de la transversale. L’occasion est gâchée. (-Moral)';
            },
          },
          {
            label: 'Chercher la passe millimétrée — Collectif',
            apply: (s2) => {
              const chance = clamp(0.4 + s2.attributes.passe / 200 + s2.attributes.vision / 260, 0.3, 0.8);
              if (nextChance(s2, chance)) {
                s2.trophies.push(`${cup} — saison ${s2.season} (${clubName})`);
                adjustReputation(s2, 8);
                adjustMorale(s2, 9);
                return `Une ouverture chirurgicale libère un coéquipier en position idéale. ${clubName} est sacré en ${cup} ! (+Réputation, +Moral)`;
              }
              adjustMorale(s2, -3);
              return 'La passe est coupée par un défenseur vigilant. L’occasion s’envole. (-Moral)';
            },
          },
          {
            label: 'Percuter balle au pied vers la surface — Technique risquée',
            apply: (s2) => {
              const chance = clamp(0.28 + s2.attributes.technique / 230 + s2.attributes.vitesse / 280, 0.2, 0.65);
              if (nextChance(s2, chance)) {
                s2.trophies.push(`${cup} — saison ${s2.season} (${clubName})`);
                adjustReputation(s2, 11);
                adjustMorale(s2, 10);
                return `Une percée solitaire venue du milieu de terrain qui affole toute la défense ! ${clubName} soulève la ${cup} ! (+Réputation, +Moral)`;
              }
              adjustDiscipline(s2, -2);
              adjustMorale(s2, -7);
              return 'Tu perds le ballon dans le pressing adverse. Une contre-attaque manque même de coûter la finale. (-Moral)';
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
        text: `90e+4, un attaquant adverse s'échappe seul face à ton gardien. Si tu ne réagis pas, la ${cup} vous échappe définitivement.`,
        choices: [
          {
            label: 'Tacle glissé décisif — Osé, risque de carton',
            apply: (s2) => {
              const chance = clamp(0.35 + s2.attributes.defense / 220, 0.25, 0.75);
              if (nextChance(s2, chance)) {
                s2.trophies.push(`${cup} — saison ${s2.season} (${clubName})`);
                adjustReputation(s2, 12);
                adjustMorale(s2, 12);
                return `Un tacle chirurgical, ballon récupéré proprement ! ${clubName} tient bon et remporte la ${cup} ! (+Réputation, +Moral)`;
              }
              adjustDiscipline(s2, -6);
              adjustReputation(s2, -6);
              adjustMorale(s2, -8);
              return `Le tacle est raté : penalty et carton contre toi. ${clubName} perd la finale par ta faute. (-Réputation, -Discipline, -Moral)`;
            },
          },
          {
            label: 'Contester sans faute — Sûr',
            apply: (s2) => {
              const chance = clamp(0.3 + s2.attributes.defense / 260 + s2.attributes.vitesse / 320, 0.2, 0.65);
              if (nextChance(s2, chance)) {
                s2.trophies.push(`${cup} — saison ${s2.season} (${clubName})`);
                adjustReputation(s2, 8);
                adjustMorale(s2, 8);
                return `Un repli propre et une contestation intelligente du ballon : l'attaquant perd ses appuis. ${clubName} est sacré en ${cup} ! (+Réputation, +Moral)`;
              }
              adjustMorale(s2, -6);
              return 'Malgré une contestation sage, l’attaquant se joue de toi et ouvre le score. La finale échappe à ton équipe. (-Moral)';
            },
          },
          {
            label: 'Le pousser hors du jeu — Antijeu, faute assumée',
            apply: (s2) => {
              adjustDiscipline(s2, -8);
              if (nextChance(s2, 0.55)) {
                s2.trophies.push(`${cup} — saison ${s2.season} (${clubName})`);
                adjustReputation(s2, 2);
                return `Une faute cynique mais efficace : l'action est cassée. ${clubName} s'impose finalement en ${cup}, non sans un carton pour toi. (-Discipline)`;
              }
              adjustReputation(s2, -10);
              adjustMorale(s2, -10);
              return `L'arbitre ne s'y trompe pas : penalty et carton rouge. ${clubName} perd la finale à dix contre onze. (-Réputation, -Discipline, -Moral)`;
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
        text: 'Séance de tirs au but, sixième tentative. Le tireur adverse s’avance, la balle et tout le poids de la finale reposent sur toi.',
        choices: [
          {
            label: 'Lire le tireur et plonger du bon côté — Sûr',
            apply: (s2) => {
              const chance = clamp(0.3 + s2.attributes.reflexes / 220 + s2.attributes.mental / 320, 0.2, 0.7);
              if (nextChance(s2, chance)) {
                s2.trophies.push(`${cup} — saison ${s2.season} (${clubName})`);
                adjustReputation(s2, 14);
                adjustMorale(s2, 14);
                return `ARRÊT DÉCISIF ! Tu détends parfaitement le bon côté. ${clubName} remporte la ${cup} aux tirs au but ! (+Réputation, +Moral)`;
              }
              adjustMorale(s2, -6);
              return `Le tir part du bon côté, mais trop puissant et trop précis. La ${cup} échappe à ton équipe. (-Moral)`;
            },
          },
          {
            label: 'Chambrer le tireur avant qu’il ne frappe — Intimidation, showman',
            apply: (s2) => {
              const chance = clamp(0.2 + s2.attributes.mental / 240, 0.12, 0.6);
              if (nextChance(s2, chance)) {
                s2.trophies.push(`${cup} — saison ${s2.season} (${clubName})`);
                s2.majorAwards.push(`Héros des tirs au but en finale de ${cup} — saison ${s2.season}`);
                adjustReputation(s2, 20);
                adjustMorale(s2, 16);
                return `Ta mise en scène déstabilise totalement le tireur, qui s'écroule sur ton arrêt. Un moment d'anthologie ! ${clubName} est sacré en ${cup} ! (+Réputation, +Moral)`;
              }
              adjustReputation(s2, -6);
              adjustMorale(s2, -10);
              return `Le tireur ignore royalement ta provocation et ajuste calmement le petit filet. ${clubName} perd la finale. (-Réputation, -Moral)`;
            },
          },
          {
            label: 'Rester campé au centre et anticiper — Technique',
            apply: (s2) => {
              const chance = clamp(0.25 + s2.attributes.reflexes / 260 + s2.attributes.technique / 340, 0.18, 0.6);
              if (nextChance(s2, chance)) {
                s2.trophies.push(`${cup} — saison ${s2.season} (${clubName})`);
                adjustReputation(s2, 10);
                adjustMorale(s2, 10);
                return `Ta position parfaite t'évite d'avoir à plonger : le ballon vient droit sur toi. ${clubName} remporte la ${cup} ! (+Réputation, +Moral)`;
              }
              adjustMorale(s2, -5);
              return 'Le tireur place son ballon dans la seule zone que tu ne couvrais pas. La finale bascule dans l’autre sens. (-Moral)';
            },
          },
        ],
      };
    },
  },
];
