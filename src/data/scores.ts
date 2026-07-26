import type { Score } from './types';

/* ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️  DONNÉES ILLUSTRATIVES — NE PAS CITER, NE PAS PUBLIER TELLES QUELLES
 *
 *  Ce fichier tient lieu de démonstration tant qu'aucun run réel n'a été
 *  exporté. Les valeurs ci-dessous ne proviennent d'aucune mesure et ne
 *  reflètent la performance réelle d'aucun modèle. Tant que
 *  `SCORES_ARE_ILLUSTRATIVE` vaut `true`, le site l'affiche à chaque visiteur.
 *
 *  Pour le remplacer par du réel :
 *      npm run bench -- doctor                  # vérifie clés et accès
 *      npm run bench -- run --models=… --budget=…
 *      npm run bench -- export                  # réécrit ce fichier
 *
 *  L'export régénère ce fichier intégralement, avec `provenance: 'measured'`,
 *  la date de mesure et le chemin des traces. Aucun autre fichier ne bouge.
 *
 *  Les identifiants correspondent aux suites internes de `bench/suites/`. Les
 *  benchmarks publics (SWE-bench, GPQA…) restent volontairement non renseignés :
 *  nous ne les exécutons pas, donc nous n'en publions pas de chiffres.
 * ═══════════════════════════════════════════════════════════════════════════ */

export const SCORES_ARE_ILLUSTRATIVE = true;

/** `modelSlug → benchmarkId → score sur 0–100`. */
const RAW_SCORES: Record<string, Record<string, number>> = {
  'claude-fable-5': {
    'int-code-python': 89.2,
    'int-tooluse': 92.8,
    'int-reasoning': 88.4,
    'int-extraction': 94.1,
    'int-instruction': 91.6,
  },
  'claude-opus-5': {
    'int-code-python': 86.7,
    'int-tooluse': 91.4,
    'int-reasoning': 86.1,
    'int-extraction': 92.7,
    'int-instruction': 90.3,
  },
  'claude-opus-4-8': {
    'int-code-python': 83.1,
    'int-tooluse': 88.6,
    'int-reasoning': 82.9,
    'int-extraction': 90.4,
    'int-instruction': 87.8,
  },
  'claude-sonnet-5': {
    'int-code-python': 81.4,
    'int-tooluse': 87.2,
    'int-reasoning': 80.6,
    'int-extraction': 89.1,
    'int-instruction': 86.4,
  },
  'claude-sonnet-4-6': {
    'int-code-python': 76.8,
    'int-tooluse': 83.5,
    'int-reasoning': 76.2,
    'int-extraction': 85.9,
    'int-instruction': 83.1,
  },
  'claude-haiku-4-5': {
    'int-code-python': 61.3,
    'int-tooluse': 71.8,
    'int-reasoning': 63.5,
    'int-extraction': 74.2,
    'int-instruction': 72.6,
  },
  'gpt-5-6-sol': {
    'int-code-python': 87.9,
    'int-tooluse': 90.1,
    'int-reasoning': 87.3,
    'int-extraction': 93.4,
    'int-instruction': 89.7,
  },
  'gpt-5-6-terra': {
    'int-code-python': 79.6,
    'int-tooluse': 85.3,
    'int-reasoning': 79.1,
    'int-extraction': 88.2,
    'int-instruction': 84.9,
  },
  'gpt-5-6-luna': {
    'int-code-python': 66.2,
    'int-tooluse': 74.6,
    'int-reasoning': 67.8,
    'int-extraction': 78.5,
    'int-instruction': 75.3,
  },
  'gpt-5-5': {
    'int-code-python': 82.4,
    'int-tooluse': 87.9,
    'int-reasoning': 83.6,
    'int-extraction': 90.8,
    'int-instruction': 86.2,
  },
  'gpt-5-5-pro': {
    'int-code-python': 88.5,
    'int-tooluse': 91.7,
    'int-reasoning': 89.2,
    'int-extraction': 93.9,
    'int-instruction': 88.4,
  },
  'gpt-5-4': {
    'int-code-python': 74.3,
    'int-tooluse': 81.2,
    'int-reasoning': 75.8,
    'int-extraction': 85.6,
    'int-instruction': 82.7,
  },
  'gemini-3-6-flash': {
    'int-code-python': 77.1,
    'int-tooluse': 82.4,
    'int-reasoning': 81.9,
    'int-extraction': 88.7,
    'int-instruction': 84.2,
  },
  'gemini-3-5-flash': {
    'int-code-python': 72.6,
    'int-tooluse': 78.9,
    'int-reasoning': 78.3,
    'int-extraction': 86.1,
    'int-instruction': 81.5,
  },
  'gemini-3-1-pro': {
    'int-code-python': 80.8,
    'int-tooluse': 85.6,
    'int-reasoning': 85.1,
    'int-extraction': 91.2,
    'int-instruction': 85.9,
  },
  'gemini-2-5-flash-lite': {
    'int-code-python': 42.7,
    'int-tooluse': 56.3,
    'int-reasoning': 48.9,
    'int-extraction': 63.4,
    'int-instruction': 61.2,
  },
  'mistral-medium-3-5': {
    'int-code-python': 63.8,
    'int-tooluse': 72.1,
    'int-reasoning': 65.4,
    'int-extraction': 77.9,
    'int-instruction': 74.6,
  },
  'mistral-small-4': {
    'int-code-python': 46.2,
    'int-tooluse': 58.7,
    'int-reasoning': 49.8,
    'int-extraction': 66.3,
    'int-instruction': 63.9,
  },
  'ministral-3b': {
    'int-code-python': 14.6,
    'int-tooluse': 28.4,
    'int-reasoning': 21.7,
    'int-extraction': 34.2,
    'int-instruction': 38.5,
  },
  // Poids ouverts : couverture partielle, pour exercer l'affichage « n/d ».
  'llama-4-maverick': {
    'int-code-python': 54.9,
    'int-reasoning': 57.2,
    'int-extraction': 69.8,
    'int-instruction': 66.4,
  },
  'deepseek-r1': {
    'int-code-python': 66.4,
    'int-reasoning': 71.9,
    'int-extraction': 74.6,
    'int-instruction': 68.2,
  },
  qwen3: {
    'int-code-python': 58.3,
    'int-tooluse': 64.1,
    'int-reasoning': 62.7,
    'int-extraction': 72.4,
    'int-instruction': 69.8,
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
        provenance: 'illustrative',
      });
    }
  }
  return out;
}

export const SCORES: Score[] = buildScores();
