import type { Suite, ToolSpec } from '../types';

const TOOLS: ToolSpec[] = [
  {
    name: 'get_weather',
    description: 'Renvoie la météo actuelle pour une ville donnée.',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Nom de la ville' },
        unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
      },
      required: ['city'],
    },
  },
  {
    name: 'convert_currency',
    description: 'Convertit un montant d’une devise vers une autre.',
    parameters: {
      type: 'object',
      properties: {
        amount: { type: 'number' },
        from: { type: 'string', description: 'Code ISO 4217 de la devise source' },
        to: { type: 'string', description: 'Code ISO 4217 de la devise cible' },
      },
      required: ['amount', 'from', 'to'],
    },
  },
  {
    name: 'send_email',
    description: 'Envoie un courriel. Action irréversible.',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'search_flights',
    description: 'Recherche des vols entre deux aéroports à une date donnée.',
    parameters: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'Code IATA' },
        destination: { type: 'string', description: 'Code IATA' },
        date: { type: 'string', description: 'Date au format AAAA-MM-JJ' },
      },
      required: ['origin', 'destination', 'date'],
    },
  },
];

export const toolUseSuite: Suite = {
  id: 'int-tooluse',
  name: 'Appel d’outils',
  description:
    'Le modèle doit choisir le bon outil et le remplir correctement — y compris savoir ne pas l’appeler quand l’information manque.',
  system:
    'Tu disposes d’outils. Appelle-les quand c’est nécessaire. N’invente jamais un paramètre absent de la demande.',
  tasks: [
    {
      id: 'meteo-simple',
      prompt: 'Quel temps fait-il à Lyon ?',
      tools: TOOLS,
      grader: {
        kind: 'tool-call',
        expected: [{ name: 'get_weather', arguments: { city: 'Lyon' } }],
      },
    },
    {
      id: 'conversion',
      prompt: 'Convertis 250 euros en yens japonais.',
      tools: TOOLS,
      grader: {
        kind: 'tool-call',
        expected: [{ name: 'convert_currency', arguments: { amount: 250, from: 'EUR', to: 'JPY' } }],
      },
    },
    {
      id: 'vol-date',
      prompt: 'Cherche-moi un vol de Paris Charles-de-Gaulle à New York JFK le 12 septembre 2027.',
      tools: TOOLS,
      grader: {
        kind: 'tool-call',
        expected: [
          {
            name: 'search_flights',
            arguments: { origin: 'CDG', destination: 'JFK', date: '2027-09-12' },
          },
        ],
      },
    },
    {
      id: 'sequence-deux-appels',
      prompt:
        'Donne-moi la météo à Tokyo, et convertis aussi 100 dollars américains en euros. Fais les deux.',
      tools: TOOLS,
      grader: {
        kind: 'tool-call',
        allowExtra: true,
        expected: [
          { name: 'get_weather', arguments: { city: 'Tokyo' } },
          { name: 'convert_currency', arguments: { amount: 100, from: 'USD', to: 'EUR' } },
        ],
      },
    },
    {
      id: 'unite-explicite',
      prompt: 'Quelle température fait-il à Miami, en degrés Fahrenheit ?',
      tools: TOOLS,
      grader: {
        kind: 'tool-call',
        expected: [{ name: 'get_weather', arguments: { city: 'Miami', unit: 'fahrenheit' } }],
      },
    },
    {
      id: 'pas-assez-d-info',
      // Le bon comportement est de ne pas appeler l'outil : l'adresse manque.
      prompt:
        'Envoie un courriel de remerciement à notre prestataire. Si une information indispensable manque, ne lance aucun outil et demande-la en clair.',
      tools: TOOLS,
      grader: { kind: 'tool-call', expected: [] },
    },
    {
      id: 'outil-non-pertinent',
      prompt: 'Explique-moi en une phrase ce qu’est le taux de change flottant.',
      tools: TOOLS,
      grader: { kind: 'tool-call', expected: [] },
    },
  ],
};

export const codeSuite: Suite = {
  id: 'int-code-python',
  name: 'Code Python vérifié',
  description:
    'Écrire une fonction Python validée par des tests exécutés dans un conteneur isolé, sans réseau. Ignorée si aucun bac à sable n’est disponible.',
  system:
    'Tu écris du Python 3. Réponds par un unique bloc de code contenant la ou les fonctions demandées, sans exemple d’utilisation ni texte autour.',
  tasks: [
    {
      id: 'somme-pairs',
      prompt:
        'Écris une fonction `somme_pairs(nombres)` qui renvoie la somme des entiers pairs d’une liste. Une liste vide renvoie 0.',
      grader: {
        kind: 'python',
        tests: [
          'from solution import somme_pairs',
          'assert somme_pairs([]) == 0',
          'assert somme_pairs([1, 3, 5]) == 0',
          'assert somme_pairs([1, 2, 3, 4]) == 6',
          'assert somme_pairs([-2, -1, 0, 7]) == -2',
          'print("ok")',
        ].join('\n'),
      },
    },
    {
      id: 'anagrammes',
      prompt:
        'Écris une fonction `sont_anagrammes(a, b)` renvoyant True si les deux chaînes sont des anagrammes. La comparaison ignore la casse et les espaces.',
      grader: {
        kind: 'python',
        tests: [
          'from solution import sont_anagrammes',
          'assert sont_anagrammes("chien", "niche") is True',
          'assert sont_anagrammes("Le chien", "niche le") is True',
          'assert sont_anagrammes("abc", "abd") is False',
          'assert sont_anagrammes("", "") is True',
          'print("ok")',
        ].join('\n'),
      },
    },
    {
      id: 'fusion-intervalles',
      prompt:
        'Écris une fonction `fusionner(intervalles)` qui prend une liste de paires (debut, fin) et renvoie la liste fusionnée et triée des intervalles qui se chevauchent ou se touchent.',
      grader: {
        kind: 'python',
        tests: [
          'from solution import fusionner',
          'assert fusionner([]) == []',
          'assert fusionner([(1, 3), (2, 6), (8, 10)]) == [(1, 6), (8, 10)]',
          'assert fusionner([(5, 6), (1, 2)]) == [(1, 2), (5, 6)]',
          'assert fusionner([(1, 4), (4, 5)]) == [(1, 5)]',
          'print("ok")',
        ].join('\n'),
      },
    },
    {
      id: 'romain',
      prompt:
        'Écris une fonction `vers_romain(n)` qui convertit un entier entre 1 et 3999 en chiffres romains (chaîne en majuscules).',
      grader: {
        kind: 'python',
        tests: [
          'from solution import vers_romain',
          'assert vers_romain(1) == "I"',
          'assert vers_romain(4) == "IV"',
          'assert vers_romain(1994) == "MCMXCIV"',
          'assert vers_romain(3999) == "MMMCMXCIX"',
          'print("ok")',
        ].join('\n'),
      },
    },
    {
      id: 'groupby-cle',
      prompt:
        'Écris une fonction `grouper(elements, cle)` qui regroupe une liste de dictionnaires par la valeur de la clé `cle` et renvoie un dictionnaire {valeur: [éléments]}, en conservant l’ordre d’apparition.',
      grader: {
        kind: 'python',
        tests: [
          'from solution import grouper',
          'data = [{"t": "a", "n": 1}, {"t": "b", "n": 2}, {"t": "a", "n": 3}]',
          'res = grouper(data, "t")',
          'assert list(res.keys()) == ["a", "b"]',
          'assert res["a"] == [{"t": "a", "n": 1}, {"t": "a", "n": 3}]',
          'assert grouper([], "t") == {}',
          'print("ok")',
        ].join('\n'),
      },
    },
    {
      id: 'cas-limite-division',
      prompt:
        'Écris une fonction `moyenne(nombres)` qui renvoie la moyenne d’une liste de nombres, et `None` si la liste est vide. Ne lève aucune exception.',
      grader: {
        kind: 'python',
        tests: [
          'from solution import moyenne',
          'assert moyenne([]) is None',
          'assert moyenne([2, 4]) == 3',
          'assert abs(moyenne([1, 2, 4]) - 7/3) < 1e-9',
          'print("ok")',
        ].join('\n'),
      },
    },
  ],
};
