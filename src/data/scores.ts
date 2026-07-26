import type { Score } from './types';

/* ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️  DONNÉES ILLUSTRATIVES — NE PAS CITER, NE PAS PUBLIER TELLES QUELLES
 *
 *  Les scores ci-dessous servent uniquement à faire vivre l'interface. Ils ne
 *  proviennent d'aucune mesure et ne reflètent la performance réelle d'aucun
 *  modèle. Tant que `SCORES_ARE_ILLUSTRATIVE` vaut `true`, le site affiche un
 *  bandeau qui le dit à chaque visiteur.
 *
 *  Pour passer en données réelles :
 *    1. remplacer `RAW_SCORES` par les valeurs mesurées ou publiées ;
 *    2. passer `provenance` à 'measured' (harness maison) ou 'published'
 *       (chiffre du fournisseur, avec `source`) dans `buildScores` ;
 *    3. basculer `SCORES_ARE_ILLUSTRATIVE` à `false`.
 *  Aucun autre fichier n'a besoin de changer.
 * ═══════════════════════════════════════════════════════════════════════════ */

export const SCORES_ARE_ILLUSTRATIVE = true;

/** `modelSlug -> benchmarkId -> score sur 0–100`. */
const RAW_SCORES: Record<string, Record<string, number>> = {
  'claude-fable-5': {
    'swe-bench-verified': 82.4,
    'terminal-bench': 63.1,
    'tau-bench': 84.7,
    livecodebench: 79.2,
    'gpqa-diamond': 88.6,
    aime: 94.3,
    'mmlu-pro': 89.1,
    mmmu: 81.5,
  },
  'claude-opus-5': {
    'swe-bench-verified': 80.9,
    'terminal-bench': 60.4,
    'tau-bench': 83.2,
    livecodebench: 77.5,
    'gpqa-diamond': 86.9,
    aime: 92.7,
    'mmlu-pro': 88.0,
    mmmu: 80.2,
  },
  'claude-opus-4-8': {
    'swe-bench-verified': 77.6,
    'terminal-bench': 56.8,
    'tau-bench': 80.9,
    livecodebench: 74.1,
    'gpqa-diamond': 84.2,
    aime: 90.1,
    'mmlu-pro': 86.4,
    mmmu: 78.3,
  },
  'claude-sonnet-5': {
    'swe-bench-verified': 76.1,
    'terminal-bench': 54.2,
    'tau-bench': 79.4,
    livecodebench: 72.8,
    'gpqa-diamond': 81.7,
    aime: 88.4,
    'mmlu-pro': 84.9,
    mmmu: 76.1,
  },
  'claude-sonnet-4-6': {
    'swe-bench-verified': 72.3,
    'terminal-bench': 49.6,
    'tau-bench': 76.2,
    livecodebench: 68.4,
    'gpqa-diamond': 78.9,
    aime: 84.6,
    'mmlu-pro': 82.7,
    mmmu: 73.5,
  },
  'claude-haiku-4-5': {
    'swe-bench-verified': 59.8,
    'terminal-bench': 33.4,
    'tau-bench': 64.1,
    livecodebench: 55.2,
    'gpqa-diamond': 65.3,
    aime: 71.8,
    'mmlu-pro': 74.6,
    mmmu: 62.4,
  },
  'gpt-5-6-sol': {
    'swe-bench-verified': 79.7,
    'terminal-bench': 58.9,
    'tau-bench': 81.6,
    livecodebench: 78.3,
    'gpqa-diamond': 87.1,
    aime: 93.5,
    'mmlu-pro': 88.7,
    mmmu: 79.8,
  },
  'gpt-5-6-terra': {
    'swe-bench-verified': 74.5,
    'terminal-bench': 52.7,
    'tau-bench': 77.8,
    livecodebench: 73.6,
    'gpqa-diamond': 82.4,
    aime: 89.2,
    'mmlu-pro': 85.3,
    mmmu: 75.6,
  },
  'gpt-5-6-luna': {
    'swe-bench-verified': 64.2,
    'terminal-bench': 38.5,
    'tau-bench': 68.3,
    livecodebench: 61.7,
    'gpqa-diamond': 70.8,
    aime: 78.4,
    'mmlu-pro': 78.1,
    mmmu: 66.9,
  },
  'gpt-5-5': {
    'swe-bench-verified': 76.8,
    'terminal-bench': 55.1,
    'tau-bench': 79.9,
    livecodebench: 75.4,
    'gpqa-diamond': 84.6,
    aime: 91.0,
    'mmlu-pro': 86.8,
    mmmu: 77.2,
  },
  'gpt-5-5-pro': {
    'swe-bench-verified': 81.3,
    'terminal-bench': 61.7,
    'tau-bench': 82.5,
    livecodebench: 80.1,
    'gpqa-diamond': 89.2,
    aime: 95.1,
    'mmlu-pro': 89.6,
    mmmu: 80.9,
  },
  'gpt-5-4': {
    'swe-bench-verified': 71.9,
    'terminal-bench': 47.3,
    'tau-bench': 75.1,
    livecodebench: 70.2,
    'gpqa-diamond': 79.5,
    aime: 86.3,
    'mmlu-pro': 83.4,
    mmmu: 73.8,
  },
  'gemini-3-6-flash': {
    'swe-bench-verified': 73.4,
    'terminal-bench': 50.8,
    'tau-bench': 74.6,
    livecodebench: 71.9,
    'gpqa-diamond': 83.1,
    aime: 90.4,
    'mmlu-pro': 85.8,
    mmmu: 82.7,
  },
  'gemini-3-5-flash': {
    'swe-bench-verified': 70.1,
    'terminal-bench': 45.9,
    'tau-bench': 71.8,
    livecodebench: 68.7,
    'gpqa-diamond': 80.2,
    aime: 87.6,
    'mmlu-pro': 83.9,
    mmmu: 80.4,
  },
  'gemini-3-1-pro': {
    'swe-bench-verified': 75.6,
    'terminal-bench': 53.4,
    'tau-bench': 76.9,
    livecodebench: 74.8,
    'gpqa-diamond': 85.7,
    aime: 92.1,
    'mmlu-pro': 87.2,
    mmmu: 84.1,
  },
  'gemini-2-5-flash-lite': {
    'swe-bench-verified': 41.3,
    'terminal-bench': 18.6,
    'tau-bench': 49.2,
    livecodebench: 38.4,
    'gpqa-diamond': 52.7,
    aime: 56.9,
    'mmlu-pro': 64.8,
    mmmu: 55.1,
  },
  'mistral-medium-3-5': {
    'swe-bench-verified': 61.7,
    'terminal-bench': 35.2,
    'tau-bench': 66.4,
    livecodebench: 58.9,
    'gpqa-diamond': 68.1,
    aime: 74.5,
    'mmlu-pro': 76.3,
    mmmu: 64.7,
  },
  'mistral-small-4': {
    'swe-bench-verified': 44.8,
    'terminal-bench': 20.1,
    'tau-bench': 52.6,
    livecodebench: 42.3,
    'gpqa-diamond': 54.9,
    aime: 60.2,
    'mmlu-pro': 66.7,
    mmmu: 52.8,
  },
  'ministral-3b': {
    'swe-bench-verified': 18.4,
    'terminal-bench': 5.2,
    'tau-bench': 27.9,
    livecodebench: 16.8,
    'gpqa-diamond': 32.1,
    aime: 24.6,
    'mmlu-pro': 44.3,
    mmmu: 0,
  },
  // Poids ouverts : couverture partielle, pour exercer l'affichage « n/d ».
  'llama-4-maverick': {
    'swe-bench-verified': 52.6,
    livecodebench: 49.8,
    'gpqa-diamond': 63.4,
    'mmlu-pro': 72.1,
    mmmu: 61.3,
  },
  'deepseek-r1': {
    'swe-bench-verified': 57.9,
    livecodebench: 63.2,
    'gpqa-diamond': 71.8,
    aime: 82.4,
    'mmlu-pro': 78.6,
  },
  qwen3: {
    'swe-bench-verified': 54.1,
    'tau-bench': 58.7,
    livecodebench: 57.6,
    'gpqa-diamond': 66.9,
    aime: 76.3,
    'mmlu-pro': 75.4,
    mmmu: 68.2,
  },
};

function buildScores(): Score[] {
  const out: Score[] = [];
  for (const [modelSlug, byBenchmark] of Object.entries(RAW_SCORES)) {
    for (const [benchmarkId, value] of Object.entries(byBenchmark)) {
      out.push({
        modelSlug,
        benchmarkId,
        value,
        provenance: SCORES_ARE_ILLUSTRATIVE ? 'illustrative' : 'published',
      });
    }
  }
  return out;
}

export const SCORES: Score[] = buildScores();
