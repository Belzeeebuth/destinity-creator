import { BENCHMARKS } from '@/data/benchmarks';
import { MODELS, PROVIDERS } from '@/data/models';
import { SCORES } from '@/data/scores';
import type { LeaderboardRow, Model, Score } from '@/data/types';

/**
 * Mélange entrée/sortie utilisé pour le coût unifié affiché dans le tableau et
 * en abscisse du nuage qualité/coût. 3 tokens d'entrée pour 1 de sortie
 * correspond à un usage conversationnel ou agentique courant ; un pipeline de
 * génération longue penche davantage vers la sortie. Le ratio est volontairement
 * unique et explicite : deux axes de prix sur un même graphique induiraient en
 * erreur.
 */
export const BLENDED_MIX = { input: 3, output: 1 } as const;

const MIX_TOTAL = BLENDED_MIX.input + BLENDED_MIX.output;

/** Coût en USD par million de tokens, au mélange `BLENDED_MIX`. */
export function blendedCost(model: Model): number | null {
  const { input, output } = model.pricing;
  if (input === null || output === null) return null;
  return (input * BLENDED_MIX.input + output * BLENDED_MIX.output) / MIX_TOTAL;
}

const SCORES_BY_MODEL = new Map<string, Record<string, Score>>();
for (const score of SCORES) {
  let bucket = SCORES_BY_MODEL.get(score.modelSlug);
  if (!bucket) {
    bucket = {};
    SCORES_BY_MODEL.set(score.modelSlug, bucket);
  }
  bucket[score.benchmarkId] = score;
}

/**
 * Indice de qualité composite : moyenne des scores disponibles pondérée par
 * `Benchmark.weight`, renormalisée sur les seuls benchmarks présents. Un modèle
 * évalué sur 4 suites sur 8 n'est donc pas pénalisé mécaniquement — mais sa
 * couverture est affichée à côté pour que la comparaison reste lisible.
 */
export function compositeQuality(scores: Record<string, Score | undefined>): number | null {
  let weighted = 0;
  let totalWeight = 0;
  for (const benchmark of BENCHMARKS) {
    const score = scores[benchmark.id];
    if (!score) continue;
    weighted += score.value * benchmark.weight;
    totalWeight += benchmark.weight;
  }
  if (totalWeight === 0) return null;
  return weighted / totalWeight;
}

/**
 * Benchmarks pour lesquels au moins un modèle a un score.
 *
 * Le catalogue liste aussi des benchmarks publics que nous n'exécutons pas : les
 * afficher comme des colonnes vides gonflerait artificiellement le dénominateur
 * de couverture. Cette liste s'ajuste d'elle-même le jour où des chiffres
 * publiés y sont renseignés.
 */
export const TRACKED_BENCHMARKS = BENCHMARKS.filter((benchmark) =>
  SCORES.some((score) => score.benchmarkId === benchmark.id),
);

/** Nombre de benchmarks renseignés pour ce modèle, sur les benchmarks suivis. */
export function coverage(scores: Record<string, Score | undefined>): number {
  return TRACKED_BENCHMARKS.filter((b) => scores[b.id]).length;
}

/**
 * Frontière de Pareto qualité/coût : un modèle y figure si aucun autre n'est à
 * la fois au moins aussi bon et au moins aussi bon marché, avec au moins un des
 * deux strictement meilleur. C'est la seule lecture honnête d'un nuage
 * qualité/prix — « le meilleur modèle » n'existe pas sans budget donné.
 */
function computeParetoFront(
  points: { slug: string; quality: number; cost: number }[],
): Set<string> {
  const front = new Set<string>();
  for (const candidate of points) {
    const dominated = points.some(
      (other) =>
        other.slug !== candidate.slug &&
        other.quality >= candidate.quality &&
        other.cost <= candidate.cost &&
        (other.quality > candidate.quality || other.cost < candidate.cost),
    );
    if (!dominated) front.add(candidate.slug);
  }
  return front;
}

/** Construit les lignes du leaderboard, triées par qualité décroissante. */
export function buildLeaderboard(): LeaderboardRow[] {
  const partial = MODELS.map((model) => {
    const scores = SCORES_BY_MODEL.get(model.slug) ?? {};
    return {
      model,
      provider: PROVIDERS[model.provider],
      scores: scores as Record<string, Score | undefined>,
      quality: compositeQuality(scores),
      blendedCost: blendedCost(model),
    };
  });

  const paretoInput = partial
    .filter((row) => row.quality !== null && row.blendedCost !== null && row.blendedCost > 0)
    .map((row) => ({
      slug: row.model.slug,
      quality: row.quality as number,
      cost: row.blendedCost as number,
    }));
  const front = computeParetoFront(paretoInput);

  return partial
    .sort((a, b) => (b.quality ?? -1) - (a.quality ?? -1))
    .map((row, index) => ({
      ...row,
      onParetoFront: front.has(row.model.slug),
      rank: index + 1,
    }));
}

/** Modèles absents du nuage qualité/coût, avec la raison de leur exclusion. */
export function scatterExclusions(rows: LeaderboardRow[]): {
  selfHosted: LeaderboardRow[];
  missingPrice: LeaderboardRow[];
  missingQuality: LeaderboardRow[];
} {
  return {
    selfHosted: rows.filter((r) => r.model.selfHosted),
    missingPrice: rows.filter((r) => !r.model.selfHosted && r.blendedCost === null),
    missingQuality: rows.filter((r) => !r.model.selfHosted && r.quality === null),
  };
}
