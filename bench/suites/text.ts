import type { Suite } from '../types';

/**
 * Suites à notation déterministe : aucune n'a besoin d'un juge LLM, donc aucune
 * n'hérite de ses biais. Toutes les réponses attendues sont vérifiables à la
 * main.
 */

export const reasoningSuite: Suite = {
  id: 'int-reasoning',
  name: 'Raisonnement vérifiable',
  description:
    'Problèmes à plusieurs étapes dont la réponse est un nombre ou une chaîne unique — notation exacte, sans juge.',
  system:
    'Tu résous des problèmes. Raisonne autant que nécessaire, puis donne une réponse unique et exacte.',
  tasks: [
    {
      id: 'train-arrivee',
      prompt:
        'Un train part à 14h20 et roule pendant 3 heures et 50 minutes. À quelle heure arrive-t-il ? Réponds au format HH:MM.',
      grader: { kind: 'exact', expected: '18:10' },
    },
    {
      id: 'billes',
      prompt:
        'Ana, Ben et Cléo se partagent 47 billes. Ana en a 5 de plus que Ben. Ben en a 3 de moins que Cléo. Combien Ben en a-t-il ? Réponds par le nombre seul.',
      grader: { kind: 'exact', expected: '13' },
    },
    {
      id: 'remise-tva',
      prompt:
        'Un article coûte 80 €. On applique d’abord une remise de 25 %, puis une TVA de 20 % sur le prix remisé. Quel est le prix final en euros ? Réponds par le nombre seul.',
      grader: { kind: 'exact', expected: '72' },
    },
    {
      id: 'chiffre-sept',
      prompt:
        'Combien de fois le chiffre 7 apparaît-il si l’on écrit tous les entiers de 1 à 100 inclus ? Réponds par le nombre seul.',
      grader: { kind: 'exact', expected: '20' },
    },
    {
      id: 'bacterie',
      prompt:
        'Une population de bactéries double toutes les 20 minutes et remplit exactement un bocal au bout de 6 heures. Au bout de combien de minutes le bocal est-il à moitié plein ? Réponds par le nombre seul.',
      grader: { kind: 'exact', expected: '340' },
    },
    {
      id: 'jour-semaine',
      prompt:
        'Le 1er mars 2027 est un lundi. Quel jour de la semaine est le 1er avril 2027 ? Réponds par le nom du jour en français, en minuscules.',
      grader: { kind: 'exact', expected: 'jeudi' },
    },
    {
      id: 'rectangle',
      prompt:
        'Un rectangle a un périmètre de 34 cm et sa longueur dépasse sa largeur de 3 cm. Quelle est son aire en cm² ? Réponds par le nombre seul.',
      grader: { kind: 'exact', expected: '70' },
    },
    {
      id: 'urne',
      prompt:
        'Une urne contient 4 boules rouges et 6 boules bleues. On tire 2 boules successivement sans remise. Quelle est la probabilité que les deux soient bleues ? Réponds par une fraction irréductible au format a/b.',
      grader: { kind: 'exact', expected: '1/3' },
    },
    {
      id: 'ppcm',
      prompt:
        'Quel est le plus petit entier strictement positif divisible à la fois par 4, 6 et 15 ? Réponds par le nombre seul.',
      grader: { kind: 'exact', expected: '60' },
    },
    {
      id: 'consommation',
      prompt:
        'Une voiture consomme 6,5 litres aux 100 km. Combien de litres consomme-t-elle sur 240 km ? Réponds par le nombre seul, avec une décimale et une virgule comme séparateur.',
      grader: { kind: 'exact', expected: '15,6' },
    },
  ],
};

export const instructionSuite: Suite = {
  id: 'int-instruction',
  name: 'Respect de consigne',
  description:
    'Contraintes de format explicites : longueur, casse, mots interdits, gabarit exact. Mesure la docilité, pas la connaissance.',
  system: 'Tu suis les consignes de format à la lettre, sans commentaire ni justification.',
  tasks: [
    {
      id: 'trois-mots-majuscules',
      prompt:
        'Décris l’océan avec exactement trois mots, séparés par des virgules, entièrement en majuscules.',
      grader: {
        kind: 'regex',
        pattern: '^[A-ZÀ-Ý\\-]+,\\s*[A-ZÀ-Ý\\-]+,\\s*[A-ZÀ-Ý\\-]+$',
        flags: '',
        target: 'final',
      },
    },
    {
      id: 'oui-non-premier',
      prompt: 'Le nombre 91 est-il premier ? Réponds uniquement par OUI ou par NON.',
      grader: { kind: 'exact', expected: 'NON' },
    },
    {
      id: 'premiers-espaces',
      prompt:
        'Donne les 5 plus petits nombres premiers, séparés par une seule espace, sans aucun autre texte.',
      grader: { kind: 'exact', expected: '2 3 5 7 11' },
    },
    {
      id: 'mot-interdit',
      prompt:
        'Écris une seule phrase décrivant l’animal domestique qui miaule. La phrase doit contenir le mot « félin ». Tu ne dois jamais employer le mot « chat », ni au singulier ni au pluriel.',
      grader: {
        kind: 'regex',
        pattern: '^(?![\\s\\S]*\\bchats?\\b)[\\s\\S]*félin[\\s\\S]*$',
        flags: 'i',
        target: 'full',
      },
    },
    {
      id: 'gabarit-accord',
      prompt:
        'Réponds exactement par le mot ACCORD, suivi de deux-points, suivi du nombre de lettres du mot « anticonstitutionnellement », sans espace.',
      grader: { kind: 'exact', expected: 'ACCORD:25', caseSensitive: true },
    },
    {
      id: 'inversion-mots',
      prompt:
        'Réécris la phrase suivante en inversant l’ordre des mots, sans ponctuation ni majuscule : « le ciel est bleu ce matin »',
      grader: { kind: 'exact', expected: 'matin ce bleu est ciel le' },
    },
    {
      id: 'compte-lettres',
      prompt:
        'Combien de fois la lettre « r » apparaît-elle dans le mot « framboisier » ? Réponds par le nombre seul.',
      grader: { kind: 'exact', expected: '2' },
    },
    {
      id: 'capitale-australie',
      prompt:
        'Quelle est la capitale de l’Australie ? Réponds par le seul nom de la ville, sans phrase.',
      grader: { kind: 'exact', expected: 'Canberra' },
    },
    {
      id: 'traduction-sans-article',
      prompt:
        'Traduis « voiture rouge » en anglais, sans article, en minuscules, deux mots seulement.',
      grader: { kind: 'exact', expected: 'red car' },
    },
    {
      id: 'code-iso',
      prompt:
        'Donne le code ISO 3166-1 alpha-2 du Japon, en majuscules, sans autre texte.',
      grader: { kind: 'exact', expected: 'JP', caseSensitive: true },
    },
  ],
};

export const extractionSuite: Suite = {
  id: 'int-extraction',
  name: 'Extraction structurée',
  description:
    'Produire un JSON exactement conforme à un schéma donné à partir d’un texte libre. Notation par égalité profonde.',
  system:
    'Tu extrais des données. Tu réponds par un unique bloc JSON valide, sans commentaire autour.',
  tasks: [
    {
      id: 'contact-simple',
      prompt:
        'Extrait les informations du texte suivant au format JSON avec exactement les clés "nom", "email", "offre".\n\n' +
        'Texte : Bonjour, je suis Camille Dubois (camille.dubois@exemple.fr) et je souhaite passer sur l’offre Entreprise.',
      grader: {
        kind: 'json',
        expected: {
          nom: 'Camille Dubois',
          email: 'camille.dubois@exemple.fr',
          offre: 'Entreprise',
        },
      },
    },
    {
      id: 'liste-nombres',
      prompt:
        'Extrait tous les nombres entiers du texte suivant, dans l’ordre d’apparition, sous forme d’un tableau JSON de nombres.\n\n' +
        'Texte : La commande 4821 contient 3 articles pour un total de 129 euros, livrés en 2 jours.',
      grader: { kind: 'json', expected: [4821, 3, 129, 2] },
    },
    {
      id: 'facture-imbriquee',
      prompt:
        'Convertis ce texte en JSON avec les clés "numero" (chaîne), "total" (nombre) et "lignes" ' +
        '(tableau d’objets à clés "designation" et "quantite").\n\n' +
        'Texte : Facture F-2027-014. Deux claviers et cinq souris. Total : 340 euros.',
      grader: {
        kind: 'json',
        expected: {
          numero: 'F-2027-014',
          total: 340,
          lignes: [
            { designation: 'claviers', quantite: 2 },
            { designation: 'souris', quantite: 5 },
          ],
        },
      },
    },
    {
      id: 'booleens',
      prompt:
        'Réponds en JSON avec exactement les clés "actif", "verifie" et "essai", valeurs booléennes.\n\n' +
        'Texte : Le compte est actif, l’adresse n’a pas encore été vérifiée, et la période d’essai est terminée.',
      grader: { kind: 'json', expected: { actif: true, verifie: false, essai: false } },
    },
    {
      id: 'null-explicite',
      prompt:
        'Réponds en JSON avec exactement les clés "ville", "code_postal" et "pays". Utilise null pour toute valeur absente du texte.\n\n' +
        'Texte : L’entrepôt se trouve à Lyon, en France.',
      grader: { kind: 'json', expected: { ville: 'Lyon', code_postal: null, pays: 'France' } },
    },
    {
      id: 'dates-iso',
      prompt:
        'Réponds en JSON avec les clés "debut" et "fin", au format ISO AAAA-MM-JJ.\n\n' +
        'Texte : La campagne court du 3 mars 2027 au 17 avril 2027.',
      grader: { kind: 'json', expected: { debut: '2027-03-03', fin: '2027-04-17' } },
    },
    {
      id: 'tri-tableau',
      prompt:
        'Extrait les prix du texte et renvoie un tableau JSON de nombres trié par ordre croissant.\n\n' +
        'Texte : Le casque est à 79 euros, la housse à 24 euros et le pied à 145 euros.',
      grader: { kind: 'json', expected: [24, 79, 145] },
    },
    {
      id: 'aucune-donnee',
      prompt:
        'Extrait les adresses email du texte suivant sous forme de tableau JSON de chaînes.\n\n' +
        'Texte : Merci de rappeler le service client au 01 23 45 67 89 avant vendredi.',
      grader: { kind: 'json', expected: [] },
    },
  ],
};
