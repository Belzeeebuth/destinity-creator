// Point de mi-saison : une courte pause interactive (trêve hivernale) entre les évènements
// de pré-saison et la simulation complète, pour casser l'instantanéité de la saison.
import type { EventTemplate } from './events';
import type { EventChoiceOutcome, PlayerState } from '../engine/types';
import { nextChance, nextInt, rngFromCarrier } from '../engine/rng';
import { adjustAttribute, adjustDiscipline, adjustFitness, adjustMorale, adjustReputation } from '../engine/util';

export const MID_SEASON_EVENTS: EventTemplate[] = [
  {
    id: 'mid_season_recharge',
    minAge: 16,
    maxAge: 45,
    weight: () => 6,
    build: () => ({
      title: 'Trêve hivernale',
      text: 'La première partie de saison s’achève. Le staff te propose de couper pour recharger les batteries avant les échéances décisives.',
      choices: [
        {
          label: 'Profiter pleinement de la coupure',
          apply: (s) => { adjustFitness(s, 12); adjustMorale(s, 8); return 'Tu reviens des vacances requinqué, prêt pour la seconde partie de saison. (+Forme, +Moral)'; },
        },
        {
          label: 'Enchaîner les séances individuelles',
          apply: (s) => { adjustAttribute(s, s.focusAttribute ?? 'technique', 2); adjustFitness(s, -5); return 'Aucune coupure : tu travailles ton point fort pendant que les autres se reposent.'; },
        },
      ],
    }),
  },
  {
    id: 'mid_season_form',
    minAge: 16,
    maxAge: 45,
    weight: () => 6,
    build: () => ({
      title: 'Coup de forme ou coup de mou ?',
      text: 'À mi-parcours, la presse spécialisée analyse ta première partie de saison.',
      choices: [
        {
          label: 'Hausser le ton en interview pour te motiver',
          apply: (s) => {
            if (nextChance(s, 0.6)) { adjustMorale(s, 10); return 'Ta sortie médiatique galvanise ton entourage. (+Moral)'; }
            adjustDiscipline(s, -4);
            return 'Tes propos sont mal reçus en interne. (-Discipline)';
          },
        },
        {
          label: 'Rester discret et laisser parler le terrain',
          apply: (s) => { adjustAttribute(s, 'mental', 2); return 'Une posture sobre qui te renforce mentalement. (+Mental)'; },
        },
      ],
    }),
  },
  {
    id: 'mid_season_stage',
    minAge: 16,
    maxAge: 26,
    weight: () => 5,
    build: () => ({
      title: 'Stage avec les espoirs',
      text: 'Un stage avec la sélection espoirs est organisé pendant la trêve.',
      choices: [
        {
          label: 'Y participer avec sérieux',
          apply: (s) => { adjustReputation(s, 3); adjustAttribute(s, 'vision', 1); return 'Une belle vitrine devant les recruteurs nationaux. (+Réputation, +Vision)'; },
        },
        {
          label: 'Décliner pour te reposer',
          apply: (s) => { adjustFitness(s, 6); return 'Tu préserves ton corps pour la suite de la saison. (+Forme)'; },
        },
      ],
    }),
  },
  {
    id: 'mid_season_market_rumor',
    minAge: 18,
    maxAge: 45,
    weight: () => 5,
    build: () => ({
      title: 'Rumeur de mercato hivernal',
      text: 'Un club approche discrètement ton entourage en plein cœur de saison.',
      choices: [
        {
          label: 'Écouter poliment, sans t’engager',
          apply: (s) => { adjustReputation(s, 2); return 'Tu restes concentré sur l’objectif du moment. (+Réputation)'; },
        },
        {
          label: 'Couper court immédiatement',
          apply: (s) => { adjustDiscipline(s, 3); return 'Ton club apprécie ta loyauté affichée en pleine saison. (+Discipline)'; },
        },
      ],
    }),
  },
  {
    id: 'mid_season_injury_scare',
    minAge: 16,
    maxAge: 45,
    weight: () => 4,
    build: () => ({
      title: 'Alerte physique',
      text: 'Une gêne récurrente inquiète le staff médical à mi-saison.',
      choices: [
        {
          label: 'Passer des examens complets par précaution',
          apply: (s) => { adjustFitness(s, 8); return 'Rien de grave détecté : tu repars rassuré. (+Forme)'; },
        },
        {
          label: 'Ignorer et continuer comme si de rien n’était',
          apply: (s) => { adjustFitness(s, -6); return 'Tu prends un risque calculé pour ne rien lâcher. (-Forme)'; },
        },
      ],
    }),
  },
  {
    id: 'mid_season_leadership',
    minAge: 24,
    maxAge: 45,
    weight: () => 4,
    build: () => ({
      title: 'Réunion de vestiaire',
      text: 'Le groupe traverse une période délicate et se tourne vers ses cadres pour recadrer les objectifs.',
      choices: [
        {
          label: 'Prendre la parole devant le groupe',
          apply: (s) => { adjustAttribute(s, 'mental', 2); adjustReputation(s, 2); return 'Ton discours marque les esprits. (+Mental, +Réputation)'; },
        },
        {
          label: 'Laisser les autres cadres gérer',
          apply: (s) => { adjustMorale(s, 3); return 'Tu restes en retrait, sans pression supplémentaire. (+Moral)'; },
        },
      ],
    }),
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
