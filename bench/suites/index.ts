import type { Suite } from '../types';
import { codeSuite, toolUseSuite } from './agentic';
import { extractionSuite, instructionSuite, reasoningSuite } from './text';

/**
 * Suites internes — écrites ici, exécutées par nous, donc les seules dont on
 * puisse revendiquer les chiffres. Leurs `id` correspondent aux benchmarks
 * marqués `kind: 'internal'` dans `src/data/benchmarks.ts`.
 *
 * Elles sont volontairement à notation déterministe (sauf le bac à sable
 * Python) : pas de juge LLM dans le chemin par défaut, donc pas de biais de
 * juge à corriger.
 */
export const SUITES: Suite[] = [
  reasoningSuite,
  instructionSuite,
  extractionSuite,
  toolUseSuite,
  codeSuite,
];

export const SUITES_BY_ID = new Map(SUITES.map((suite) => [suite.id, suite]));

export function getSuite(id: string): Suite | undefined {
  return SUITES_BY_ID.get(id);
}

export function totalTasks(suiteIds: string[]): number {
  return suiteIds.reduce((sum, id) => sum + (SUITES_BY_ID.get(id)?.tasks.length ?? 0), 0);
}
