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

  // CreationPage — steps + summary
  stepCountry: { fr: 'Pays', en: 'Country' },
  stepPosition: { fr: 'Poste', en: 'Position' },
  stepBackground: { fr: 'Origine', en: 'Background' },
  stepLifestyle: { fr: 'Mode de vie', en: 'Lifestyle' },
  stepAgent: { fr: 'Représentation', en: 'Representation' },
  stepSummary: { fr: 'Résumé', en: 'Summary' },
  creationBack: { fr: '← Retour', en: '← Back' },
  creationContinue: { fr: 'Continuer →', en: 'Continue →' },
  creationStart: { fr: 'Commencer ma carrière ⚽', en: 'Start my career ⚽' },
  backgroundStepTitle: { fr: 'Choisis ton origine sociale', en: 'Choose your social background' },
  backgroundStepSubtitle: {
    fr: "Ton milieu d'origine influence tes attributs de départ et ta résilience face aux épreuves.",
    en: 'Your background shapes your starting attributes and your resilience in the face of hardship.',
  },
  lifestyleStepTitle: { fr: "Choisis ton mode de vie d'adolescent", en: 'Choose your teenage lifestyle' },
  lifestyleStepSubtitle: {
    fr: 'Ta discipline quotidienne influence ta vitesse de progression et tes risques de blessure ou d\'incident.',
    en: 'Your daily discipline shapes how fast you progress and your risk of injury or incidents.',
  },
  agentStepTitle: { fr: 'Choisis ta représentation', en: 'Choose your representation' },
  agentStepSubtitle: {
    fr: "Ton agent influence la fréquence et la qualité des offres de club que tu recevras.",
    en: "Your agent shapes the frequency and quality of the club offers you'll receive.",
  },
  summaryTitle: { fr: "Dernière étape avant le coup d'envoi", en: 'Last step before kickoff' },
  summarySubtitle: {
    fr: 'Vérifie ton profil (et donne-lui un nom si tu le souhaites).',
    en: 'Check your profile (and give it a name if you like).',
  },
  firstNamePlaceholder: { fr: 'Prénom (auto si vide)', en: 'First name (auto if empty)' },
  lastNamePlaceholder: { fr: 'Nom (auto si vide)', en: 'Last name (auto if empty)' },
  randomizeName: { fr: '🎲 Randomiser', en: '🎲 Randomize' },
  summaryAge: { fr: 'Âge de départ', en: 'Starting age' },
  summaryAgeValue: { fr: '16 ans', en: '16 years old' },
  summaryAgeSub: { fr: 'Retraite obligatoire à 45 ans', en: 'Mandatory retirement at 45' },

  // CountryStep
  countryStepTitle: { fr: 'Choisis ton pays de départ', en: 'Choose your starting country' },
  countryStepSubtitle: {
    fr: "Le pays détermine la difficulté de ta progression : concurrence pour percer, qualité des infrastructures, exposition aux recruteurs et facilité d'accès à la sélection nationale.",
    en: "Your country shapes the difficulty of your progression: competition to break through, infrastructure quality, exposure to scouts, and how easy it is to reach the national team.",
  },
  searchCountry: { fr: 'Rechercher un pays...', en: 'Search for a country...' },
  filterAll: { fr: 'Tous', en: 'All' },
  statCompetition: { fr: 'Concurrence', en: 'Competition' },
  statInfrastructure: { fr: 'Infrastructures', en: 'Infrastructure' },
  statScouting: { fr: 'Recruteurs', en: 'Scouting' },
  statLeague: { fr: 'Championnat', en: 'League' },
  statNationalTeam: { fr: 'Sélection nat.', en: 'National team' },
  noCountryMatch: { fr: 'Aucun pays ne correspond à ta recherche.', en: 'No country matches your search.' },

  // PositionStep
  positionStepTitle: { fr: 'Choisis ton poste', en: 'Choose your position' },
  positionStepSubtitle: {
    fr: 'Le poste détermine les attributs qui comptent le plus dans ta progression et ta note globale.',
    en: 'Your position determines which attributes matter most for your progression and overall rating.',
  },

  // ClubStatusBar
  statusRating: { fr: 'Note', en: 'Rating' },
  statusClub: { fr: 'Club', en: 'Club' },
  statusFreeAgent: { fr: 'Libre', en: 'Free agent' },
  statusWage: { fr: 'Salaire', en: 'Wage' },
  statusPerYear: { fr: 'par an', en: 'per year' },
  statusValue: { fr: 'Valeur', en: 'Value' },
  statusCaps: { fr: 'Sélections', en: 'Caps' },
  statusGoals: { fr: 'buts', en: 'goals' },
  statusMorale: { fr: 'Moral', en: 'Morale' },
  statusFitness: { fr: 'Forme', en: 'Fitness' },

  // AttributesPanel
  attributesTitle: { fr: 'Attributs', en: 'Attributes' },
  attributesOverall: { fr: 'global', en: 'overall' },

  // TransferWindowPanel
  transferMercatoTitle: { fr: '🔁 Mercato', en: '🔁 Transfer window' },
  transferFirstClubTitle: { fr: '🔍 Trouve ton premier club', en: '🔍 Find your first club' },
  transferMercatoSubPrefix: { fr: "Des clubs s'intéressent à toi. Rester à", en: 'Clubs are interested in you. Staying at' },
  transferMercatoSubSuffix: { fr: 'reste possible.', en: 'remains possible.' },
  transferFirstClubSub: {
    fr: 'Voici les propositions reçues pour démarrer ta carrière professionnelle.',
    en: 'Here are the offers received to start your professional career.',
  },
  roleTitulaire: { fr: 'Titulaire annoncé', en: 'Starter promised' },
  roleRotation: { fr: "Rotation d'effectif", en: 'Squad rotation' },
  roleReserviste: { fr: 'Réserviste', en: 'Reserve' },
  perYearShort: { fr: '/an', en: '/year' },
  signingBonusLabel: { fr: 'Prime à la signature :', en: 'Signing bonus:' },
  releaseClauseLabel: { fr: 'Clause libératoire :', en: 'Release clause:' },
  negotiateWage: { fr: '💰 Négocier le salaire', en: '💰 Negotiate the wage' },
  negotiateRole: { fr: '🧢 Exiger le statut de titulaire', en: '🧢 Demand starter status' },
  negotiateClause: { fr: '📜 Exiger une clause libératoire', en: '📜 Demand a release clause' },
  signButton: { fr: 'Signer', en: 'Sign' },
  negotiateTitle: { fr: 'Négocier les termes du contrat', en: 'Negotiate the contract terms' },
  stayAtCurrentClub: { fr: 'Rester à mon club actuel', en: 'Stay at my current club' },
  stayFreeAgent: { fr: 'Rester libre cette saison', en: 'Stay a free agent this season' },

  // EventPanel
  continueButton: { fr: 'Continuer', en: 'Continue' },
  loadingSeason: { fr: 'Chargement de la saison...', en: 'Loading the season...' },
  midSeasonBreak: { fr: '❄️ Trêve hivernale — mi-saison', en: '❄️ Winter break — mid-season' },
  eventHeader: { fr: '🗓️ Événement — saison', en: '🗓️ Event — season' },

  // PreseasonPanel
  preseasonTitle: { fr: 'Préparation de la saison', en: 'Season preparation' },
  preseasonSubtitle: {
    fr: "Choisis l'attribut sur lequel concentrer ton entraînement cette saison. Il progressera plus vite que les autres.",
    en: 'Choose the attribute to focus your training on this season. It will improve faster than the others.',
  },
  availableItems: { fr: '🎒 Objets disponibles', en: '🎒 Available items' },

  // SeasonSimPanel
  seasonStartTitle: { fr: 'La saison', en: 'Season' },
  seasonStartTitleSuffix: { fr: 'va commencer', en: 'is about to begin' },
  seasonStartDescPrefix: {
    fr: 'Matchs de championnat, coupes, sélection nationale... découvre comment se déroule ta saison avec',
    en: 'League matches, cups, the national team... find out how your season goes with',
  },
  freeAgentStatus: { fr: 'ton statut de libre', en: 'your free agent status' },
  chooseTacticalApproach: { fr: 'Choisis ton approche tactique pour cette saison', en: 'Choose your tactical approach for this season' },
  playstyleOffensifLabel: { fr: 'Offensif', en: 'Attacking' },
  playstyleOffensifDesc: {
    fr: 'Plus de buts et de passes décisives, mais plus de cartons et de risques de blessure.',
    en: 'More goals and assists, but more cards and injury risk.',
  },
  playstyleEquilibreLabel: { fr: 'Équilibré', en: 'Balanced' },
  playstyleEquilibreDesc: {
    fr: 'Une approche neutre, sans excès dans un sens ou dans l’autre.',
    en: 'A neutral approach, without excess in either direction.',
  },
  playstyleDefensifLabel: { fr: 'Défensif', en: 'Defensive' },
  playstyleDefensifDesc: {
    fr: 'Moins prolifique, mais plus fiable : moins de cartons, moins de blessures, note plus stable.',
    en: 'Less prolific, but more reliable: fewer cards, fewer injuries, a steadier rating.',
  },

  // SeasonEndPanel
  seasonRecapTitle: { fr: '📋 Bilan de la saison', en: '📋 Season recap' },
  statMatches: { fr: 'Matchs', en: 'Matches' },
  statCleanSheets: { fr: 'Clean sheets', en: 'Clean sheets' },
  statSaves: { fr: 'Arrêts', en: 'Saves' },
  statGoals: { fr: 'Buts', en: 'Goals' },
  statAssists: { fr: 'Passes D.', en: 'Assists' },
  statAvgRating: { fr: 'Note moy.', en: 'Avg rating' },
  yellowCard: { fr: 'carton jaune', en: 'yellow card' },
  yellowCards: { fr: 'cartons jaunes', en: 'yellow cards' },
  redCard: { fr: 'carton rouge', en: 'red card' },
  redCards: { fr: 'cartons rouges', en: 'red cards' },
  attributeEvolution: { fr: 'Évolution des attributs', en: 'Attribute changes' },
  seasonHighlights: { fr: 'Faits marquants de la saison', en: 'Highlights of the season' },
  estimatedMarketValue: { fr: 'Valeur marchande estimée :', en: 'Estimated market value:' },
  finishCareer: { fr: 'Terminer ma carrière', en: 'Finish my career' },
  continueCareer: { fr: 'Continuer la carrière →', en: 'Continue the career →' },
  retireNowButton: { fr: 'Prendre ma retraite maintenant', en: 'Retire now' },

  // TournamentInvitePanel
  callUpHeader: { fr: 'Convocation — sélection de', en: 'Call-up — national team of' },
  callUpBodyPrefix: { fr: 'Le sélectionneur national t’appelle pour disputer', en: 'The national coach is calling you up for' },
  callUpBodySuffix: {
    fr: "cette saison ! Souhaites-tu te lancer dans la grande aventure de la sélection, au risque de mettre ton club entre parenthèses le temps de la compétition ?",
    en: "this season! Do you want to embark on the great national team adventure, at the risk of putting your club career on hold for the competition?",
  },
  askAgent: { fr: '🧳 Ton agent', en: '🧳 Your agent' },
  askFamily: { fr: '👪 Ta famille', en: '👪 Your family' },
  askCoach: { fr: '🧑‍🏫 Ton entraîneur en club', en: '🧑‍🏫 Your club coach' },
  acceptCallUp: { fr: '✅ Accepter la sélection', en: '✅ Accept the call-up' },
  declineCallUp: { fr: '🚫 Refuser — me concentrer sur mon club', en: '🚫 Decline — focus on my club' },
  askAdvice: { fr: '🤔 Demander conseil', en: '🤔 Ask for advice' },
  adviceAgentNoRep: {
    fr: "Tu gères seul ta carrière... mais tu sais très bien qu'une grande vitrine internationale peut faire décoller ta valeur marchande si tu brilles là-bas.",
    en: "You manage your own career... but you know very well that a big international stage can send your market value soaring if you shine there.",
  },
  adviceAgentRep: {
    fr: 'Une vitrine internationale pareille, ça ne se refuse pas ! Ta valeur marchande peut s\'envoler si tu performes.',
    en: "An international stage like this one, you don't turn it down! Your market value can skyrocket if you perform.",
  },
  adviceFamilyTired: {
    fr: "👪 Ta famille s'inquiète : « Tu rentres fatigué ces derniers temps... Un tournoi en plus, physiquement, ce n'est pas rien. À toi de voir si ton corps peut suivre. »",
    en: "👪 Your family is worried: \"You've been coming home tired lately... An extra tournament is a lot on your body. It's up to you to see if you can handle it.\"",
  },
  adviceFamilyProud: {
    fr: "👪 Ta famille : « On est fiers que tu sois appelé ! Quoi que tu décides, profite de ce moment : ça ne se représente pas tous les jours. »",
    en: '👪 Your family: "We\'re proud that you got called up! Whatever you decide, enjoy the moment: it doesn\'t come around every day."',
  },
  adviceCoachNoClub: {
    fr: "🧑‍🏫 Sans club actuellement, rien ne t'empêche de foncer : ce tournoi est une occasion en or de te montrer aux yeux de tous les recruteurs.",
    en: "🧑‍🏫 With no club right now, nothing is stopping you from going for it: this tournament is a golden opportunity to show yourself to every scout watching.",
  },
  adviceCoachLowMorale: {
    fr: "🧑‍🏫 Ton entraîneur en club : « Avec ton moral en ce moment, la pression d'un tournoi peut autant te relancer que te briser. Réfléchis bien. »",
    en: '🧑‍🏫 Your club coach: "With your morale right now, tournament pressure could just as easily relaunch you as break you. Think it over."',
  },
  adviceCoachDefault: {
    fr: "🧑‍🏫 Ton entraîneur en club : « Attention à ne pas revenir cramé pour la reprise du championnat... mais l'expérience internationale, ça ne se refuse pas. »",
    en: '🧑‍🏫 Your club coach: "Just be careful not to come back exhausted for the league restart... but international experience is not something you turn down."',
  },

  // TournamentPanel
  stageGroups: { fr: 'Poules', en: 'Groups' },
  stageR16: { fr: '8es', en: 'R16' },
  stageQuarters: { fr: 'Quarts', en: 'QF' },
  stageSemis: { fr: 'Demies', en: 'SF' },
  stageFinal: { fr: 'Finale', en: 'Final' },
  knockoutPhaseLabel: { fr: 'Phase à élimination directe', en: 'Knockout stage' },
  knockoutSub: { fr: 'Match couperet : la défaite met fin au tournoi.', en: 'A single-match decider: defeat ends the tournament.' },
  reviewGroupStanding: { fr: 'Revoir le classement de la phase de poules', en: 'Review the group stage standings' },
  nextOpponentLabel: { fr: 'Prochain adversaire :', en: 'Next opponent:' },
  playMatch: { fr: '⚽ Disputer', en: '⚽ Play' },
  playMatchGeneric: { fr: 'le match', en: 'the match' },
  tableTeam: { fr: 'Équipe', en: 'Team' },
  tableP: { fr: 'J', en: 'P' },
  tableW: { fr: 'G', en: 'W' },
  tableD: { fr: 'N', en: 'D' },
  tableL: { fr: 'P', en: 'L' },
  tableDiff: { fr: 'Diff', en: 'GD' },
  tablePts: { fr: 'Pts', en: 'Pts' },
  ratingLabel: { fr: 'Note :', en: 'Rating:' },
  topScorerTitle: { fr: 'Meilleur buteur', en: 'Top scorer' },
  topPlaymakerTitle: { fr: 'Meilleur passeur', en: 'Top playmaker' },
  bestPlayerTitle: { fr: 'Meilleur joueur', en: 'Best player' },
  finalGroupStanding: { fr: 'Classement final de la poule', en: 'Final group standings' },
  tournamentJourney: { fr: 'Parcours dans la compétition', en: 'Journey through the competition' },
  continueToClubSeason: { fr: 'Continuer vers la saison en club', en: 'Continue to the club season' },
  tournamentRecapGoal: { fr: 'but', en: 'goal' },
  tournamentRecapGoals: { fr: 'buts', en: 'goals' },
  tournamentRecapAssist: { fr: 'passe décisive', en: 'assist' },
  tournamentRecapAssists: { fr: 'passes décisives', en: 'assists' },
  tournamentRecapMatch: { fr: 'match', en: 'match' },
  tournamentRecapMatches: { fr: 'matchs', en: 'matches' },
  tournamentRecapAvgRating: { fr: 'note moyenne', en: 'average rating' },

  // CareerRecap
  careerOverTitle: { fr: 'Fin de carrière', en: 'Career over' },
  legendScoreLabel: { fr: 'Score de légende', en: 'Legend score' },
  tokensEarnedLabel: { fr: 'Jetons gagnés', en: 'Tokens earned' },
  newBadgesLabel: { fr: 'Nouveaux badges', en: 'New badges' },
  statTrophies: { fr: 'Trophées', en: 'Trophies' },
  statInjuries: { fr: 'Blessures', en: 'Injuries' },
  statCards: { fr: 'Cartons 🟨/🟥', en: 'Cards 🟨/🟥' },
  statBallonNominations: { fr: 'Nominations Meilleur Joueur', en: 'Best Player nominations' },
  statRetiredAt: { fr: 'Retraite à', en: 'Retired at' },
  statFinalValue: { fr: 'Valeur finale', en: 'Final value' },
  individualAwardsTitle: { fr: '🌟 Distinctions individuelles', en: '🌟 Individual awards' },
  newBadgesUnlockedTitle: { fr: 'Nouveaux badges débloqués', en: 'New badges unlocked' },
  trophiesTitle: { fr: 'Palmarès collectif', en: 'Team honours' },
  hideButton: { fr: 'Masquer', en: 'Hide' },
  viewSeasonBySeasonButton: { fr: '📅 Voir la carrière saison par saison', en: '📅 View career season by season' },
  tableAge: { fr: 'Âge', en: 'Age' },
  tableClub: { fr: 'Club', en: 'Club' },
  tableDivision: { fr: 'Division', en: 'Division' },
  tableRating: { fr: 'Note', en: 'Rating' },
  tableCaps: { fr: 'Sélections', en: 'Caps' },
  tablePasses: { fr: 'Passes', en: 'Assists' },
  copiedLabel: { fr: 'Copié !', en: 'Copied!' },
  shareButton: { fr: '📤 Partager', en: '📤 Share' },
  challengeFriendButton: { fr: '🆚 Défier un ami', en: '🆚 Challenge a friend' },
  challengeCodeExplainer: {
    fr: "Transmets ce code à un ami : il commencera avec exactement les mêmes conditions de départ et les mêmes tirages aléatoires que toi, à lui de faire mieux !",
    en: "Send this code to a friend: they'll start with exactly the same conditions and the same random rolls as you did — it's up to them to do better!",
  },
  replayCareerButton: { fr: 'Rejouer une carrière', en: 'Replay a career' },
  backToHomeButton: { fr: "Retour à l'accueil", en: 'Back to home' },
  shareText: {
    fr: "J'ai écrit ma légende sur Destiny Eleven :",
    en: 'I wrote my legend on Destiny Eleven:',
  },
  shareTextMiddle: { fr: '—', en: '—' },
  shareTextGoals: { fr: 'buts', en: 'goals' },
  shareTextCaps: { fr: 'sélections, retraite à', en: 'caps, retired at' },
  shareTextAge: { fr: 'ans. Score de légende :', en: '. Legend score:' },

  // OverallEvolutionChart
  overallEvolutionTitle: { fr: '📈 Évolution du niveau global', en: '📈 Overall rating evolution' },
  overallEvolutionAlt: { fr: 'Évolution de la note globale au fil des saisons', en: 'Overall rating evolution over the seasons' },
  peakLabel: { fr: 'Pic :', en: 'Peak:' },

  // BadgesPage
  badgesTitle: { fr: '🏅 Badges', en: '🏅 Badges' },
  badgesUnlockedOf: { fr: 'débloqués, cumulés sur toutes tes carrières jouées sur cet appareil.', en: 'unlocked, cumulated across every career played on this device.' },

  // StoryModePage
  storyModeConfirmReplace: { fr: 'Une carrière est en cours. La remplacer par ce mode Histoire ?', en: 'A career is in progress. Replace it with this Story Mode career?' },
  storyModeTitle: { fr: '📖 Mode Histoire', en: '📖 Story Mode' },
  storyModeSubtitle: {
    fr: "Reprends les conditions de départ exactes d'une carrière légendaire (même pays, même poste, mêmes tirages) et tente de dépasser son score de légende.",
    en: "Start from the exact same conditions as a legendary career (same country, same position, same random rolls) and try to beat its legend score.",
  },
  toBeat: { fr: 'À battre :', en: 'To beat:' },
  legendGoals: { fr: 'buts', en: 'goals' },
  legendCaps: { fr: 'sélections', en: 'caps' },
  legendTrophies: { fr: 'trophées', en: 'trophies' },
  legendScoreShort: { fr: 'score', en: 'score' },
  replayThisCareer: { fr: 'Rejouer cette carrière', en: 'Replay this career' },

  // ChallengesPage
  challengeConfirmReplace: { fr: 'Une carrière est en cours. La remplacer par ce défi ?', en: 'A career is in progress. Replace it with this challenge?' },
  invalidCode: { fr: "Ce code n'est pas valide.", en: 'This code is not valid.' },
  dailyChallengeTitle: { fr: '🎯 Défi quotidien', en: '🎯 Daily challenge' },
  dailyChallengeSubtitle: {
    fr: "Un point de départ identique pour tout le monde aujourd'hui — même pays, même poste, mêmes tirages aléatoires.",
    en: 'The same starting point for everyone today — same country, same position, same random rolls.',
  },
  dailyChallengeAlreadyPlayed: { fr: 'Défi déjà joué aujourd’hui.', en: 'Challenge already played today.' },
  scoreLabel: { fr: 'Score :', en: 'Score:' },
  playDailyChallenge: { fr: 'Jouer le défi du jour', en: "Play today's challenge" },
  friendChallengeTitle: { fr: '🆚 Défi entre amis', en: '🆚 Challenge a friend' },
  friendChallengeSubtitle: {
    fr: "Colle ici le code reçu d'un ami : tu démarreras avec exactement les mêmes conditions et les mêmes tirages aléatoires que sa carrière. À toi de faire mieux avec tes propres choix.",
    en: "Paste the code you received from a friend here: you'll start with exactly the same conditions and the same random rolls as their career. It's up to you to do better with your own choices.",
  },
  pasteCodePlaceholder: { fr: 'Colle le code partagé par ton ami ici...', en: "Paste the code shared by your friend here..." },
  takeChallengeButton: { fr: 'Relever le défi', en: 'Take the challenge' },
  friendChallengeFooter: {
    fr: "Pour défier un ami à ton tour, termine une carrière puis récupère ton code depuis l'écran de fin de carrière.",
    en: 'To challenge a friend in turn, finish a career then grab your code from the end-of-career screen.',
  },

  // PantheonPage
  pantheonTitle: { fr: '🏛️ Panthéon', en: '🏛️ Pantheon' },
  pantheonSubtitle: {
    fr: 'Les légendes écrites sur cet appareil, classées par score de légende. Clique sur une légende pour revivre sa carrière saison par saison.',
    en: 'The legends written on this device, ranked by legend score. Click on a legend to relive their career season by season.',
  },
  pantheonEmptyTitle: { fr: "Aucune légende inscrite pour l'instant.", en: 'No legend written yet.' },
  pantheonEmptySub: { fr: 'Termine une carrière pour tenter d’entrer au Panthéon.', en: 'Finish a career to try to enter the Pantheon.' },
  seasonBySeasonLabel: { fr: 'Saison par saison', en: 'Season by season' },

  // BoutiquePage
  boutiqueTitle: { fr: '🛒 Boutique', en: '🛒 Shop' },
  boutiqueSubtitle: {
    fr: "Dépense les jetons gagnés en fin de carrière pour améliorer des avantages permanents par paliers (1 à 3). Équipe-en jusqu'à {n} pour ta prochaine carrière.",
    en: 'Spend tokens earned at the end of a career to upgrade permanent advantages in tiers (1 to 3). Equip up to {n} for your next career.',
  },
  boutiqueEquippedFor: { fr: 'Équipés pour la prochaine carrière :', en: 'Equipped for the next career:' },
  boutiqueLevelLabel: { fr: 'Niveau', en: 'Level' },
  boutiqueOfLabel: { fr: 'sur', en: 'of' },
  boutiqueCurrentEffect: { fr: 'Effet actuel :', en: 'Current effect:' },
  boutiqueUpgradeTo: { fr: 'Améliorer →', en: 'Upgrade →' },
  boutiqueUnlockLevel1: { fr: 'Débloquer niveau 1', en: 'Unlock level 1' },
  boutiqueEquippedCheck: { fr: 'Équipé ✓', en: 'Equipped ✓' },
  boutiqueSlotsFull: { fr: 'Emplacements pleins', en: 'Slots full' },
  boutiqueEquipButton: { fr: 'Équiper', en: 'Equip' },
  boutiqueConsumablesTitle: { fr: '🎒 Objets consommables', en: '🎒 Consumable items' },
  boutiqueConsumablesSubtitle: {
    fr: "Utilisables une fois en cours de carrière (depuis l'écran de préparation de saison).",
    en: 'Usable once during a career (from the season preparation screen).',
  },
  boutiqueInStock: { fr: 'En stock :', en: 'In stock:' },
  boutiqueBuyButton: { fr: 'Acheter', en: 'Buy' },

  // PatrimoinePage
  backToCareer: { fr: '← Retour à ma carrière', en: '← Back to my career' },
  patrimoineTitle: { fr: '💰 Patrimoine & vie privée', en: '💰 Wealth & personal life' },
  patrimoineSubtitle: {
    fr: 'Ce que tu deviens ne se joue pas que sur le terrain : fais fructifier ton argent et prends soin de tes proches.',
    en: 'What you become is not decided on the pitch alone: grow your money and take care of your loved ones.',
  },
  savingsAvailable: { fr: 'Épargne disponible', en: 'Available savings' },
  savingsHint: {
    fr: 'Alimentée automatiquement par une partie de ton salaire net à chaque fin de saison.',
    en: 'Automatically topped up with part of your net salary at the end of each season.',
  },
  traditionalInvestmentsTitle: { fr: '📊 Investissements traditionnels', en: '📊 Traditional investments' },
  traditionalInvestmentsSubtitle: {
    fr: 'Chaque actif évolue à sa manière en fin de saison : rendement moyen, volatilité et risque de krach propres à chaque classe.',
    en: 'Each asset evolves in its own way at the end of the season: average return, volatility and crash risk specific to each class.',
  },
  noPositionOpen: { fr: 'Aucune position ouverte.', en: 'No open position.' },
  amountPlaceholder: { fr: 'Montant', en: 'Amount' },
  investButton: { fr: 'Investir', en: 'Invest' },
  withdrawAllButton: { fr: 'Tout retirer', en: 'Withdraw all' },
  cryptoMarketTitle: { fr: '🪙 Marché crypto', en: '🪙 Crypto market' },
  cryptoMarketSubtitle: {
    fr: "{n} actifs distincts, du plus établi au plus spéculatif. Le niveau de risque de chacun est propre à cette carrière : il change à chaque nouvelle partie. Marché fictif entièrement simulé par le jeu — aucun cours réel n'est répliqué.",
    en: '{n} distinct assets, from the most established to the most speculative. Each one\'s risk level is specific to this career: it changes with every new game. A fictional market entirely simulated by the game — no real-world price is replicated.',
  },
  tableAsset: { fr: 'Actif', en: 'Asset' },
  tableRisk: { fr: 'Risque', en: 'Risk' },
  tablePosition: { fr: 'Position', en: 'Position' },
  tablePerformance: { fr: 'Performance', en: 'Performance' },
  tableAction: { fr: 'Action', en: 'Action' },
  withdrawButton: { fr: 'Retirer', en: 'Withdraw' },
  prestigeTitle: { fr: '🏆 Prestige', en: '🏆 Prestige' },
  prestigeSubtitle: {
    fr: "Des achats uniques et durables : certains font grimper ta réputation d'un coup, d'autres t'aident à encaisser les prochains coups durs médiatiques.",
    en: 'Unique, lasting purchases: some boost your reputation instantly, others help you absorb future media setbacks.',
  },
  reputationShieldActive: { fr: '🛡️ Bouclier de réputation actif : -{n}% sur tes futures pertes de réputation.', en: '🛡️ Reputation shield active: -{n}% on your future reputation losses.' },
  reputationLabel: { fr: 'Réputation', en: 'Reputation' },
  shieldLabel: { fr: 'Bouclier', en: 'Shield' },
  alreadyOwnedCheck: { fr: 'Déjà acquis ✓', en: 'Already owned ✓' },
  personalLifeTitle: { fr: '❤️ Vie privée', en: '❤️ Personal life' },
  statusSingle: { fr: '💔 Célibataire', en: '💔 Single' },
  statusInCouple: { fr: '💑 En couple avec', en: '💑 In a relationship with' },
  statusMarried: { fr: '💍 Marié(e) à', en: '💍 Married to' },
  sinceSeasonLabel: { fr: 'Depuis la saison', en: 'Since season' },
  closenessLabel: { fr: 'Complicité', en: 'Closeness' },
  singleHint: { fr: 'Une rencontre peut survenir au fil des évènements de saison.', en: 'A meeting can happen through season events.' },
  giftsToFamily: { fr: '🎁 Cadeaux à la famille', en: '🎁 Gifts to family' },
  giftsToPartner: { fr: '🎁 Cadeaux au/à la partenaire', en: '🎁 Gifts to partner' },
  giftAvailableInCouple: { fr: 'Disponible une fois en couple.', en: 'Available once in a relationship.' },
} as const;

export type UiKey = keyof typeof UI;

export function ui(lang: Language, key: UiKey): string {
  return UI[key][lang];
}
