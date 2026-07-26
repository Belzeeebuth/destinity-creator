/**
 * Contrat du harness d'évaluation.
 *
 * Deux principes structurent ces types :
 *  - une tâche non exécutable (`skipped`) n'est jamais comptée comme un échec ;
 *    elle sort du dénominateur et le nombre d'exclusions est rapporté ;
 *  - chaque résultat porte de quoi être rejoué : identifiant exact du modèle,
 *    empreinte du prompt, paramètres, horodatage.
 */

import type { ProviderId } from '../src/data/types';

export type EffortLevel = 'low' | 'medium' | 'high';

export interface ToolSpec {
  name: string;
  description: string;
  /** JSON Schema des paramètres. */
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatRequest {
  system?: string;
  user: string;
  maxTokens: number;
  tools?: ToolSpec[];
  effort?: EffortLevel;
}

export interface ChatResponse {
  text: string;
  toolCalls: ToolCall[];
  usage: { inputTokens: number; outputTokens: number };
  /**
   * Le modèle a décliné pour raison de politique. Distinct d'une mauvaise
   * réponse : on veut pouvoir compter les refus séparément.
   */
  refused: boolean;
  stopReason: string | null;
  latencyMs: number;
}

export interface PingResult {
  ok: boolean;
  detail: string;
}

export interface ProviderAdapter {
  id: ProviderId | 'mock';
  /** Variable d'environnement portant la clé, `null` si aucune n'est requise. */
  envKey: string | null;
  /** Vérifie la connectivité au coût le plus faible possible. */
  ping(apiId: string): Promise<PingResult>;
  chat(apiId: string, request: ChatRequest): Promise<ChatResponse>;
}

/* ── Graders ─────────────────────────────────────────────────────────────── */

export type GraderSpec =
  | { kind: 'exact'; expected: string; caseSensitive?: boolean }
  | {
      kind: 'regex';
      pattern: string;
      flags?: string;
      /** Défaut `true`. À `false`, la tâche exige l'absence du motif. */
      expectMatch?: boolean;
      /** Sur quoi tester : la ligne `FINAL:` ou toute la réponse. Défaut `full`. */
      target?: 'final' | 'full';
    }
  | { kind: 'json'; expected: unknown }
  | {
      kind: 'tool-call';
      /** Séquence attendue. `arguments` est comparé en sous-ensemble. */
      expected: { name: string; arguments?: Record<string, unknown> }[];
      /** Autorise des appels supplémentaires après la séquence attendue. */
      allowExtra?: boolean;
    }
  | {
      kind: 'python';
      /** Code de test pytest-compatible exécuté contre la solution du modèle. */
      tests: string;
      /** Nom du fichier dans lequel écrire le code du modèle. */
      moduleName?: string;
    }
  | {
      kind: 'llm-judge';
      rubric: string;
      /** Slugs des modèles juges. Le score retenu est la médiane. */
      judges: string[];
    };

export type GradeStatus = 'pass' | 'fail' | 'skipped' | 'error';

export interface Grade {
  status: GradeStatus;
  /** 0 à 1. Ignoré quand `status` vaut `skipped` ou `error`. */
  score: number;
  detail: string;
}

/* ── Tâches et suites ────────────────────────────────────────────────────── */

export interface Task {
  id: string;
  prompt: string;
  system?: string;
  tools?: ToolSpec[];
  maxTokens?: number;
  grader: GraderSpec;
  /** Poids dans le score de la suite. Défaut : 1. */
  weight?: number;
}

export interface Suite {
  /** Doit correspondre à un `Benchmark.id` du site. */
  id: string;
  name: string;
  description: string;
  /** Consigne commune ajoutée en tête du prompt système de chaque tâche. */
  system?: string;
  tasks: Task[];
}

/* ── Résultats ───────────────────────────────────────────────────────────── */

export interface TaskResult {
  runId: string;
  modelSlug: string;
  providerId: string;
  apiId: string;
  suiteId: string;
  taskId: string;
  /** Numéro de passe quand une tâche est répétée (k > 1). */
  repeat: number;
  grade: Grade;
  usage: { inputTokens: number; outputTokens: number };
  /** `null` quand le tarif du modèle n'est pas connu. */
  costUsd: number | null;
  latencyMs: number;
  refused: boolean;
  /** Sortie brute, conservée pour l'audit. */
  output: string;
  toolCalls: ToolCall[];
  /** Empreinte du prompt effectif : un prompt modifié invalide la comparaison. */
  promptHash: string;
  startedAt: string;
  error?: string;
}

export interface RunMeta {
  runId: string;
  startedAt: string;
  finishedAt: string | null;
  harnessVersion: string;
  models: string[];
  suites: string[];
  repeats: number;
  maxTokens: number;
  effort?: EffortLevel;
  budgetUsd: number;
  spentUsd: number;
  /** Renseigné quand le run s'est arrêté avant la fin. */
  stoppedReason: string | null;
  counts: {
    total: number;
    pass: number;
    fail: number;
    skipped: number;
    error: number;
    refused: number;
  };
}

export interface RunConfig {
  models: string[];
  suites: string[];
  repeats: number;
  concurrency: number;
  budgetUsd: number;
  maxTokens: number;
  effort?: EffortLevel;
  /** N'appelle aucune API : affiche le plan et le coût estimé. */
  dryRun: boolean;
  /** Autorise les modèles sans tarif connu (le plafond ne les couvre pas). */
  allowUnpriced: boolean;
}
