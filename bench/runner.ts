import { FINAL_MARKER_INSTRUCTION, grade } from './graders';
import { resolveModel, type ResolvedModel } from './providers';
import { FatalError, RetryableError } from './providers/http';
import { hashKey, isMockModel, mockKey, registerMockOracle } from './providers/mock';
import { newRunId, RunStore } from './store';
import { SUITES_BY_ID } from './suites';
import type { ChatRequest, RunConfig, RunMeta, Suite, Task, TaskResult } from './types';

export const HARNESS_VERSION = '1.0.0';

/** Levée quand le plafond de dépense est atteint : arrête le run proprement. */
class BudgetExceeded extends Error {}

interface PlannedCall {
  model: ResolvedModel;
  suite: Suite;
  task: Task;
  repeat: number;
}

/** Prompt effectif : c'est cette chaîne, pas la tâche, qui définit l'empreinte. */
function buildRequest(suite: Suite, task: Task, maxTokens: number): ChatRequest {
  const needsFinalMarker =
    task.grader.kind === 'exact' ||
    (task.grader.kind === 'regex' && (task.grader.target ?? 'full') === 'final');

  const system = [suite.system, task.system, needsFinalMarker ? FINAL_MARKER_INSTRUCTION : null]
    .filter(Boolean)
    .join('\n\n');

  return {
    system: system || undefined,
    user: task.prompt,
    maxTokens: task.maxTokens ?? maxTokens,
    tools: task.tools,
  };
}

export function promptHashOf(request: ChatRequest): string {
  return hashKey(mockKey(request));
}

/** Estimation grossière, volontairement pessimiste : elle borne la dépense. */
function worstCaseCost(model: ResolvedModel, request: ChatRequest): number | null {
  const { input, output } = model.pricing;
  if (input === null || output === null) return null;
  const estimatedInput = Math.ceil(((request.system?.length ?? 0) + request.user.length) / 3.5);
  return (estimatedInput * input + request.maxTokens * output) / 1_000_000;
}

function actualCost(model: ResolvedModel, usage: { inputTokens: number; outputTokens: number }) {
  const { input, output } = model.pricing;
  if (input === null || output === null) return null;
  return (usage.inputTokens * input + usage.outputTokens * output) / 1_000_000;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Réessaie ce qui mérite de l'être, jamais une requête invalide. Le délai
 * conseillé par le serveur prime sur le repli exponentiel.
 */
async function callWithRetry<T>(
  fn: () => Promise<T>,
  { maxRetries = 4, onRetry }: { maxRetries?: number; onRetry?: (attempt: number, wait: number, reason: string) => void } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (error instanceof FatalError || !(error instanceof RetryableError)) throw error;
      if (attempt === maxRetries) break;
      const advised = error.retryAfterSeconds;
      const backoff = 2 ** attempt + Math.random();
      const waitSeconds = advised !== undefined ? Math.max(advised, backoff) : backoff;
      onRetry?.(attempt + 1, waitSeconds, error.message);
      await sleep(waitSeconds * 1000);
    }
  }
  throw lastError;
}

export interface RunOutcome {
  runId: string;
  meta: RunMeta;
  results: TaskResult[];
}

export interface RunHooks {
  onProgress?: (done: number, total: number, result: TaskResult) => void;
  onNotice?: (message: string) => void;
}

export async function runBenchmark(
  config: RunConfig,
  hooks: RunHooks = {},
  now: Date = new Date(),
): Promise<RunOutcome> {
  const models = config.models.map(resolveModel);

  const unpriced = models.filter((m) => !m.local && m.pricing.input === null);
  if (unpriced.length > 0 && !config.allowUnpriced) {
    throw new FatalError(
      `tarif inconnu pour ${unpriced.map((m) => m.slug).join(', ')} — le plafond de budget ` +
        `ne peut pas les couvrir. Renseignez le tarif dans src/data/models.ts, ou relancez ` +
        `avec --allow-unpriced en connaissance de cause.`,
    );
  }

  const plan: PlannedCall[] = [];
  for (const model of models) {
    for (const suiteId of config.suites) {
      const suite = SUITES_BY_ID.get(suiteId);
      if (!suite) throw new FatalError(`suite inconnue : ${suiteId}`);
      for (const task of suite.tasks) {
        for (let repeat = 1; repeat <= config.repeats; repeat += 1) {
          plan.push({ model, suite, task, repeat });
        }
      }
    }
  }

  const runId = newRunId(now);
  const store = new RunStore(runId);
  const results: TaskResult[] = [];
  const counts = { total: 0, pass: 0, fail: 0, skipped: 0, error: 0, refused: 0 };
  let spentUsd = 0;
  let stoppedReason: string | null = null;

  const meta = (): RunMeta => ({
    runId,
    startedAt: now.toISOString(),
    finishedAt: null,
    harnessVersion: HARNESS_VERSION,
    models: config.models,
    suites: config.suites,
    repeats: config.repeats,
    maxTokens: config.maxTokens,
    effort: config.effort,
    budgetUsd: config.budgetUsd,
    spentUsd,
    stoppedReason,
    counts,
  });

  if (config.dryRun) {
    let worstCase = 0;
    let unknown = 0;
    for (const call of plan) {
      const estimate = worstCaseCost(call.model, buildRequest(call.suite, call.task, config.maxTokens));
      if (estimate === null) unknown += 1;
      else worstCase += estimate;
    }
    hooks.onNotice?.(
      `Plan : ${plan.length} appels. Coût maximal estimé ${worstCase.toFixed(2)} $` +
        (unknown > 0 ? ` (+ ${unknown} appels sans tarif connu, non chiffrés).` : '.'),
    );
    return { runId, meta: { ...meta(), finishedAt: now.toISOString() }, results: [] };
  }

  await store.init();
  await store.writeMeta(meta());

  let index = 0;
  const queue = [...plan];

  async function worker(): Promise<void> {
    for (;;) {
      const call = queue.shift();
      if (!call) return;
      if (stoppedReason) return;

      const request = buildRequest(call.suite, call.task, config.maxTokens);
      if (config.effort) request.effort = config.effort;
      const hash = promptHashOf(request);

      // Le plafond est vérifié avant l'appel, avec l'estimation pessimiste :
      // on préfère s'arrêter un appel trop tôt qu'un appel trop tard.
      const estimate = worstCaseCost(call.model, request);
      if (estimate !== null && spentUsd + estimate > config.budgetUsd) {
        stoppedReason =
          `plafond de ${config.budgetUsd} $ atteint — l'appel suivant pouvait coûter ` +
          `jusqu'à ${estimate.toFixed(4)} $ (estimation pessimiste)`;
        return;
      }

      if (isMockModel(call.model.slug)) {
        registerMockOracle(hash, oracleFor(call.task));
      }

      const startedAt = new Date().toISOString();
      let result: TaskResult;
      try {
        const response = await callWithRetry(
          () => call.model.adapter.chat(call.model.apiId, request),
          {
            onRetry: (attempt, wait, reason) =>
              hooks.onNotice?.(
                `${call.model.slug}/${call.task.id} : nouvel essai ${attempt} dans ${wait.toFixed(1)} s — ${reason}`,
              ),
          },
        );
        const cost = actualCost(call.model, response.usage);
        if (cost !== null) spentUsd += cost;

        const verdict = await grade(call.task.grader, response);
        result = {
          runId,
          modelSlug: call.model.slug,
          providerId: call.model.providerId,
          apiId: call.model.apiId,
          suiteId: call.suite.id,
          taskId: call.task.id,
          repeat: call.repeat,
          grade: verdict,
          usage: response.usage,
          costUsd: cost,
          latencyMs: response.latencyMs,
          refused: response.refused,
          output: response.text,
          toolCalls: response.toolCalls,
          promptHash: hash,
          startedAt,
        };
      } catch (error) {
        result = {
          runId,
          modelSlug: call.model.slug,
          providerId: call.model.providerId,
          apiId: call.model.apiId,
          suiteId: call.suite.id,
          taskId: call.task.id,
          repeat: call.repeat,
          grade: { status: 'error', score: 0, detail: 'appel en échec' },
          usage: { inputTokens: 0, outputTokens: 0 },
          costUsd: null,
          latencyMs: 0,
          refused: false,
          output: '',
          toolCalls: [],
          promptHash: hash,
          startedAt,
          error: error instanceof Error ? error.message : String(error),
        };
      }

      counts.total += 1;
      counts[result.grade.status] += 1;
      if (result.refused) counts.refused += 1;
      results.push(result);
      await store.append(result);
      index += 1;
      hooks.onProgress?.(index, plan.length, result);
    }
  }

  const workers = Array.from({ length: Math.max(1, config.concurrency) }, () => worker());
  try {
    await Promise.all(workers);
  } catch (error) {
    if (!(error instanceof BudgetExceeded)) throw error;
  }

  const finished: RunMeta = { ...meta(), finishedAt: new Date().toISOString() };
  await store.writeMeta(finished);
  return { runId, meta: finished, results };
}

/**
 * Bonne réponse fournie au fournisseur factice. N'est jamais consultée par un
 * vrai modèle : `registerMockOracle` n'est appelé que pour les slugs `mock-*`.
 */
function oracleFor(task: Task): { answer: string; toolCalls?: { name: string; arguments: Record<string, unknown> }[] } {
  switch (task.grader.kind) {
    case 'exact':
      return { answer: `FINAL: ${task.grader.expected}` };
    case 'json':
      return { answer: `\`\`\`json\n${JSON.stringify(task.grader.expected)}\n\`\`\`` };
    case 'tool-call':
      return {
        answer: 'FINAL: (appel d’outil)',
        toolCalls: task.grader.expected.map((call) => ({
          name: call.name,
          arguments: call.arguments ?? {},
        })),
      };
    case 'regex':
      // Le factice ne sait pas fabriquer une chaîne satisfaisant un motif
      // arbitraire : ces tâches ressortent en échec, ce qui est le comportement
      // attendu d'un double de test.
      return { answer: 'FINAL: motif non simulé' };
    default:
      return { answer: 'FINAL: non simulé' };
  }
}
