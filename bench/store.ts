import { appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { RunMeta, TaskResult } from './types';

export const RUNS_DIR = join(process.cwd(), 'bench', 'runs');

/**
 * Chaque run est un dossier : `results.jsonl` conserve la trace intégrale de
 * chaque appel (sortie brute comprise), `meta.json` le contexte et les
 * compteurs. C'est ce qui rend un score auditable plutôt que déclaratif.
 */
export class RunStore {
  readonly dir: string;
  private readonly resultsPath: string;

  constructor(readonly runId: string) {
    this.dir = join(RUNS_DIR, runId);
    this.resultsPath = join(this.dir, 'results.jsonl');
  }

  async init(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  async append(result: TaskResult): Promise<void> {
    await appendFile(this.resultsPath, `${JSON.stringify(result)}\n`, 'utf8');
  }

  async writeMeta(meta: RunMeta): Promise<void> {
    await writeFile(join(this.dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  }
}

export async function loadResults(runId: string): Promise<TaskResult[]> {
  const path = join(RUNS_DIR, runId, 'results.jsonl');
  if (!existsSync(path)) return [];
  const raw = await readFile(path, 'utf8');
  return raw
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as TaskResult);
}

export async function loadMeta(runId: string): Promise<RunMeta | null> {
  const path = join(RUNS_DIR, runId, 'meta.json');
  if (!existsSync(path)) return null;
  return JSON.parse(await readFile(path, 'utf8')) as RunMeta;
}

/** Les identifiants de run commencent par un horodatage : l'ordre lexical suffit. */
export async function listRunIds(): Promise<string[]> {
  if (!existsSync(RUNS_DIR)) return [];
  const entries = await readdir(RUNS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export async function latestRunId(): Promise<string | null> {
  const ids = await listRunIds();
  return ids.length > 0 ? ids[ids.length - 1] : null;
}

export function newRunId(now: Date): string {
  const iso = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  return `${iso}Z`;
}
