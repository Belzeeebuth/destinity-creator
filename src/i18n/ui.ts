// Dictionnaire de traduction pour le texte d'interface statique (hors récits d'évènements,
// qui vivent directement dans les fichiers de données via le helper `loc()`).
import type { Language } from './language';

const UI = {
  // Navigation
  navShop: { fr: 'Boutique', en: 'Shop' },
  navBadges: { fr: 'Badges', en: 'Badges' },
  navPantheon: { fr: 'Panthéon', en: 'Pantheon' },
  navWealth: { fr: 'Patrimoine', en: 'Wealth' },

  // Footer
  footerTagline: {
    fr: 'Destiny Eleven — recréation fan-made et indépendante, jouée entièrement dans ton navigateur.',
    en: 'Destiny Eleven — an independent, fan-made recreation, played entirely in your browser.',
  },
  footerPrivacy: {
    fr: 'Aucune collecte de données, aucun cookie tiers : ta progression est sauvegardée uniquement sur cet appareil (stockage local).',
    en: 'No data collection, no third-party cookies: your progress is saved only on this device (local storage).',
  },

  // HomePage
  homeBadge: { fr: 'De 16 à 45 ans', en: 'Age 16 to 45' },
  homeTitlePrefix: { fr: 'Écris ta légende du', en: 'Write your' },
  homeTitleHighlight: { fr: 'football', en: 'football legend' },
  homeSubtitle: {
    fr: "De 16 à 45 ans, façonne une carrière de footballeur, saison après saison. Ton pays de départ, tes origines, ton mode de vie : chaque choix compte. Personne ne connaît son destin à l'avance.",
    en: 'From 16 to 45, shape a footballer\'s career, season after season. Your starting country, your background, your lifestyle: every choice matters. Nobody knows their destiny in advance.',
  },
  homeResumeCareer: { fr: 'Reprendre ma carrière —', en: 'Resume my career —' },
  homeSeasonAge: { fr: 'Saison', en: 'Season' },
  homeYearsOld: { fr: 'ans', en: 'years old' },
  homeStartNewCareer: { fr: 'Commencer une nouvelle carrière à la place', en: 'Start a new career instead' },
  homeCurrentCareer: { fr: 'Ta carrière en cours', en: 'Your current career' },
  homeConfirmOverwrite: {
    fr: 'sera définitivement perdue. Confirmer ?',
    en: 'will be permanently lost. Confirm?',
  },
  homeConfirmOverwriteSeason: { fr: 'saison', en: 'season' },
  homeConfirmYes: { fr: 'Oui, écraser et recommencer', en: 'Yes, overwrite and restart' },
  homeCancel: { fr: 'Annuler', en: 'Cancel' },
  homeStartCareer: { fr: 'Commencer ma carrière', en: 'Start my career' },
  homeStoryModeTitle: { fr: 'Mode Histoire', en: 'Story Mode' },
  homeStoryModeDesc: {
    fr: "Rejoue des carrières légendaires et tente de faire mieux qu'elles.",
    en: 'Replay legendary careers and try to do better than them.',
  },
  homeChallengeTitle: { fr: 'Défi quotidien & entre amis', en: 'Daily & friends challenge' },
  homeChallengeDesc: {
    fr: 'Un point de départ commun chaque jour, ou un code à partager pour défier tes amis.',
    en: 'A shared starting point every day, or a code to share and challenge your friends.',
  },
  homePantheonTitle: { fr: 'Panthéon', en: 'Pantheon' },
  homePantheonDesc: {
    fr: 'Découvre les légendes déjà écrites sur cet appareil.',
    en: 'Discover the legends already written on this device.',
  },
  homeCountriesNoteBold: { fr: '90 pays jouables', en: '90 playable countries' },
  homeCountriesNoteRest: {
    fr: '— des grandes nations du football aux plus petites micro-nations — influencent directement la difficulté de ta progression : concurrence, infrastructures, accès à la sélection nationale...',
    en: '— from footballing giants to the smallest micro-nations — directly shape the difficulty of your progression: competition, infrastructure, access to the national team...',
  },
} as const;

export type UiKey = keyof typeof UI;

export function ui(lang: Language, key: UiKey): string {
  return UI[key][lang];
}
