import type { Benchmark, BenchmarkCategory } from './types';

export const CATEGORY_LABELS: Record<BenchmarkCategory, string> = {
  coding: 'Code',
  agentic: 'Agentique',
  reasoning: 'Raisonnement',
  math: 'Mathématiques',
  knowledge: 'Connaissances',
  vision: 'Vision',
};

/**
 * Suites internes — écrites dans `bench/suites/`, exécutées par notre harness.
 * Ce sont les seules dont nous produisons les chiffres nous-mêmes, avec les
 * traces d'appel conservées run par run.
 *
 * `weight` alimente l'indice de qualité composite : le code et l'agentique
 * pèsent le plus (les moins saturés, les plus corrélés à l'usage réel), le
 * respect de consigne le moins.
 */
const INTERNAL: Benchmark[] = [
  {
    id: 'int-code-python',
    name: 'Code Python vérifié',
    kind: 'internal',
    category: 'coding',
    description:
      'Écrire une fonction Python validée par des tests exécutés dans un conteneur isolé, sans réseau. Aucun juge : le code passe les tests ou non.',
    unit: '% de tâches réussies',
    weight: 1.5,
    url: 'https://github.com/Belzeeebuth/destinity-creator/tree/main/bench/suites/agentic.ts',
  },
  {
    id: 'int-tooluse',
    name: 'Appel d’outils',
    kind: 'internal',
    category: 'agentic',
    description:
      'Choisir le bon outil, le remplir correctement, et savoir ne pas l’appeler quand une information indispensable manque.',
    unit: '% de séquences conformes',
    weight: 1.3,
    url: 'https://github.com/Belzeeebuth/destinity-creator/tree/main/bench/suites/agentic.ts',
  },
  {
    id: 'int-reasoning',
    name: 'Raisonnement vérifiable',
    kind: 'internal',
    category: 'reasoning',
    description:
      'Problèmes à plusieurs étapes dont la réponse est un nombre ou une chaîne unique — notation exacte, vérifiable à la main.',
    unit: '% de réponses exactes',
    weight: 1.2,
    url: 'https://github.com/Belzeeebuth/destinity-creator/tree/main/bench/suites/text.ts',
  },
  {
    id: 'int-extraction',
    name: 'Extraction structurée',
    kind: 'internal',
    category: 'knowledge',
    description:
      'Produire un JSON exactement conforme à un schéma imposé à partir d’un texte libre. Notation par égalité profonde.',
    unit: '% de JSON conformes',
    weight: 1.0,
    url: 'https://github.com/Belzeeebuth/destinity-creator/tree/main/bench/suites/text.ts',
  },
  {
    id: 'int-instruction',
    name: 'Respect de consigne',
    kind: 'internal',
    category: 'knowledge',
    description:
      'Contraintes de format explicites : casse, longueur, mots interdits, gabarit exact. Mesure la docilité, pas la connaissance.',
    unit: '% de consignes tenues',
    weight: 0.8,
    url: 'https://github.com/Belzeeebuth/destinity-creator/tree/main/bench/suites/text.ts',
  },
];

/**
 * Benchmarks publics — listés pour référence. Nous ne les exécutons pas : leurs
 * scores ne peuvent venir que d'un chiffre publié, avec sa source. Tant qu'ils
 * ne sont pas renseignés, le site affiche « n/d ».
 */
const PUBLIC: Benchmark[] = [
  {
    id: 'swe-bench-verified',
    name: 'SWE-bench Verified',
    kind: 'public',
    category: 'coding',
    description:
      'Issues GitHub réelles à résoudre dans un dépôt complet. Le patch produit doit faire passer les tests cachés du projet.',
    unit: '% résolu',
    weight: 1.5,
    url: 'https://www.swebench.com/',
  },
  {
    id: 'terminal-bench',
    name: 'Terminal-Bench',
    kind: 'public',
    category: 'agentic',
    description:
      'Tâches en ligne de commande dans un conteneur : compiler, déboguer, administrer. Mesure la tenue sur un horizon long.',
    unit: '% réussi',
    weight: 1.5,
    url: 'https://www.tbench.ai/',
  },
  {
    id: 'tau-bench',
    name: 'τ-bench',
    kind: 'public',
    category: 'agentic',
    description:
      'Dialogues client avec appels d’outils sous contraintes métier. Mesure la fiabilité du function calling, pas la fluidité.',
    unit: '% réussi',
    weight: 1.2,
    url: 'https://github.com/sierra-research/tau-bench',
  },
  {
    id: 'livecodebench',
    name: 'LiveCodeBench',
    kind: 'public',
    category: 'coding',
    description:
      'Problèmes de programmation compétitive publiés après la date de coupure des modèles — conçu contre la contamination.',
    unit: '% résolu',
    weight: 1.2,
    url: 'https://livecodebench.github.io/',
  },
  {
    id: 'gpqa-diamond',
    name: 'GPQA Diamond',
    kind: 'public',
    category: 'reasoning',
    description:
      'Questions de niveau doctorat en biologie, physique et chimie, écrites pour résister à la recherche web.',
    unit: '% correct',
    weight: 1.0,
    url: 'https://github.com/idavidrein/gpqa',
  },
  {
    id: 'aime',
    name: 'AIME',
    kind: 'public',
    category: 'math',
    description:
      'Olympiade mathématique américaine. Réponse entière unique, donc pas de juge LLM ni d’ambiguïté de notation.',
    unit: '% correct',
    weight: 0.8,
    url: 'https://artofproblemsolving.com/wiki/index.php/AIME',
  },
  {
    id: 'mmlu-pro',
    name: 'MMLU-Pro',
    kind: 'public',
    category: 'knowledge',
    description:
      'QCM à 10 options sur 14 disciplines. Utile comme plancher, mais le plus exposé à la contamination.',
    unit: '% correct',
    weight: 0.5,
    url: 'https://github.com/TIGER-AI-Lab/MMLU-Pro',
  },
  {
    id: 'mmmu',
    name: 'MMMU',
    kind: 'public',
    category: 'vision',
    description:
      'Raisonnement multimodal sur schémas, graphiques et documents de niveau universitaire.',
    unit: '% correct',
    weight: 0.8,
    url: 'https://mmmu-benchmark.github.io/',
  },
];

export const BENCHMARKS: Benchmark[] = [...INTERNAL, ...PUBLIC];

export const INTERNAL_BENCHMARKS = INTERNAL;
export const PUBLIC_BENCHMARKS = PUBLIC;

export const BENCHMARKS_BY_ID = new Map(BENCHMARKS.map((b) => [b.id, b]));

export function getBenchmark(id: string): Benchmark | undefined {
  return BENCHMARKS_BY_ID.get(id);
}
