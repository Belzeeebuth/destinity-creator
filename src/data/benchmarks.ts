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
 * Les benchmarks suivis par le leaderboard.
 *
 * `weight` alimente l'indice de qualité composite. Les suites agentiques et de
 * code pèsent plus lourd parce qu'elles sont les moins saturées et les plus
 * corrélées à l'usage réel ; les QCM de connaissances pèsent moins parce qu'ils
 * sont les plus exposés à la contamination des données d'entraînement.
 */
export const BENCHMARKS: Benchmark[] = [
  {
    id: 'swe-bench-verified',
    name: 'SWE-bench Verified',
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
    category: 'agentic',
    description:
      "Dialogues client avec appels d'outils sous contraintes métier. Mesure la fiabilité du function calling, pas la fluidité.",
    unit: '% réussi',
    weight: 1.2,
    url: 'https://github.com/sierra-research/tau-bench',
  },
  {
    id: 'livecodebench',
    name: 'LiveCodeBench',
    category: 'coding',
    description:
      "Problèmes de programmation compétitive publiés après la date de coupure des modèles — conçu contre la contamination.",
    unit: '% résolu',
    weight: 1.2,
    url: 'https://livecodebench.github.io/',
  },
  {
    id: 'gpqa-diamond',
    name: 'GPQA Diamond',
    category: 'reasoning',
    description:
      "Questions de niveau doctorat en biologie, physique et chimie, écrites pour résister à la recherche web.",
    unit: '% correct',
    weight: 1.0,
    url: 'https://github.com/idavidrein/gpqa',
  },
  {
    id: 'aime',
    name: 'AIME',
    category: 'math',
    description:
      "Olympiade mathématique américaine. Réponse entière unique, donc pas de juge LLM ni d'ambiguïté de notation.",
    unit: '% correct',
    weight: 0.8,
    url: 'https://artofproblemsolving.com/wiki/index.php/AIME',
  },
  {
    id: 'mmlu-pro',
    name: 'MMLU-Pro',
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
    category: 'vision',
    description:
      'Raisonnement multimodal sur schémas, graphiques et documents de niveau universitaire.',
    unit: '% correct',
    weight: 0.8,
    url: 'https://mmmu-benchmark.github.io/',
  },
];

export const BENCHMARKS_BY_ID = new Map(BENCHMARKS.map((b) => [b.id, b]));

export function getBenchmark(id: string): Benchmark | undefined {
  return BENCHMARKS_BY_ID.get(id);
}
