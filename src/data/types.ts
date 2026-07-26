/**
 * Modèle de données du leaderboard.
 *
 * Conçu pour être alimenté plus tard par un vrai moteur d'évaluation : chaque
 * score porte sa provenance, chaque prix porte sa date de vérification, et les
 * champs réellement inconnus valent `null` plutôt qu'une valeur inventée.
 */

export type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'mistral'
  | 'meta'
  | 'deepseek'
  | 'alibaba';

export interface Provider {
  id: ProviderId;
  name: string;
  /** Page de tarification officielle. */
  pricingUrl: string;
}

export type BenchmarkCategory =
  | 'coding'
  | 'agentic'
  | 'reasoning'
  | 'math'
  | 'knowledge'
  | 'vision';

export interface Benchmark {
  id: string;
  name: string;
  /**
   * `internal` : suite écrite et exécutée par notre harness (`bench/suites`),
   * donc la seule dont on puisse revendiquer les chiffres.
   * `public` : benchmark tiers, listé pour référence ; ses scores ne peuvent
   * venir que d'une publication citée, jamais de nous.
   */
  kind: 'internal' | 'public';
  category: BenchmarkCategory;
  /** Ce que le benchmark mesure réellement, en une phrase. */
  description: string;
  /** Unité affichée à côté du score (les scores sont normalisés sur 0–100). */
  unit: string;
  /** Poids dans l'indice de qualité composite. La somme n'a pas besoin de faire 1. */
  weight: number;
  /** Lien vers la définition du benchmark. */
  url: string;
}

export interface Pricing {
  /** USD par million de tokens d'entrée. `null` = non publié / inconnu. */
  input: number | null;
  /** USD par million de tokens de sortie. */
  output: number | null;
  /** USD par million de tokens lus depuis le cache, si applicable. */
  cachedInput?: number | null;
  /** Précision affichée sous le prix (tarif d'intro, palier long contexte…). */
  note?: string;
}

export interface Capabilities {
  vision: boolean;
  toolUse: boolean;
  /** Raisonnement étendu / thinking exposé par l'API. */
  thinking: boolean;
  /** Poids ouverts, donc exécutable en local (Ollama, vLLM…). */
  openWeights: boolean;
}

export interface Model {
  slug: string;
  name: string;
  provider: ProviderId;
  /**
   * Identifiant exact à passer à l'API. `null` quand il n'a pas pu être vérifié
   * — on préfère ne rien afficher qu'afficher une chaîne qui renverra une 404.
   */
  apiId: string | null;
  /** Date de sortie ISO, `null` si inconnue. */
  releasedAt: string | null;
  /** Fenêtre de contexte en tokens. */
  contextWindow: number | null;
  /** Plafond de tokens de sortie par requête. */
  maxOutput: number | null;
  pricing: Pricing;
  capabilities: Capabilities;
  /**
   * Vrai pour les modèles qu'on exécute soi-même : le coût est de
   * l'infrastructure, pas du token. Ces modèles sont exclus du nuage
   * qualité/coût (et le nombre d'exclus est affiché sous le graphique).
   */
  selfHosted: boolean;
  /** Date à laquelle les tarifs et limites ont été relevés. */
  verifiedAt: string;
  /** Sources consultées pour ce modèle. */
  sources: string[];
  notes?: string;
}

/** Un score de benchmark rattaché à un modèle. */
export interface Score {
  modelSlug: string;
  benchmarkId: string;
  /** Score normalisé sur 0–100. */
  value: number;
  /**
   * `illustrative` : valeur de démonstration, sans autorité.
   * `published`    : chiffre publié par le fournisseur ou un tiers (avec source).
   * `measured`     : produit par notre propre harness d'évaluation.
   */
  provenance: 'illustrative' | 'published' | 'measured';
  source?: string;
  /** Date de la mesure ou de la publication. */
  measuredAt?: string;
}

/** Ligne du leaderboard : un modèle + ses scores agrégés. */
export interface LeaderboardRow {
  model: Model;
  provider: Provider;
  /** Score par benchmark, indexé par `benchmarkId`. */
  scores: Record<string, Score | undefined>;
  /** Indice de qualité composite 0–100, `null` si aucun score disponible. */
  quality: number | null;
  /** Coût d'un appel type, en USD (voir `BLENDED_MIX` dans lib/leaderboard). */
  blendedCost: number | null;
  /** Le modèle est-il sur la frontière de Pareto qualité/coût ? */
  onParetoFront: boolean;
  rank: number;
}
