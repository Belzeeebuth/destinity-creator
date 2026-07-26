import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

export const SANDBOX_IMAGE = 'python:3.11-slim';

let availability: Promise<{ ok: boolean; detail: string }> | null = null;

/**
 * Le code produit par un modèle ne s'exécute jamais sur l'hôte. Sans daemon
 * Docker joignable, les tâches de code sont marquées `skipped` — jamais
 * exécutées ailleurs, jamais comptées comme des échecs.
 */
export function sandboxAvailable(): Promise<{ ok: boolean; detail: string }> {
  if (!availability) {
    availability = (async () => {
      try {
        await run('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 15_000 });
        return { ok: true, detail: 'daemon Docker joignable' };
      } catch (error) {
        return {
          ok: false,
          detail: `daemon Docker injoignable — ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`,
        };
      }
    })();
  }
  return availability;
}

export interface SandboxResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/**
 * Exécute `check.py` contre la solution du modèle dans un conteneur jetable :
 * pas de réseau, mémoire et processus bornés, privilèges figés, minuterie dure.
 */
export async function runPythonCheck(
  solutionCode: string,
  checkCode: string,
  { timeoutSeconds = 30 } = {},
): Promise<SandboxResult> {
  const dir = await mkdtemp(join(tmpdir(), 'bench-py-'));
  try {
    await writeFile(join(dir, 'solution.py'), solutionCode, 'utf8');
    await writeFile(join(dir, 'check.py'), checkCode, 'utf8');

    const args = [
      'run',
      '--rm',
      '--network',
      'none',
      '--memory',
      '512m',
      '--cpus',
      '1',
      '--pids-limit',
      '128',
      '--security-opt',
      'no-new-privileges',
      '--env',
      'PYTHONDONTWRITEBYTECODE=1',
      '--workdir',
      '/work',
      '--volume',
      `${dir}:/work`,
      SANDBOX_IMAGE,
      'timeout',
      String(timeoutSeconds),
      'python',
      'check.py',
    ];

    try {
      const { stdout, stderr } = await run('docker', args, {
        timeout: (timeoutSeconds + 20) * 1000,
        maxBuffer: 4 * 1024 * 1024,
      });
      return { exitCode: 0, stdout, stderr, timedOut: false };
    } catch (error) {
      const err = error as { code?: number; stdout?: string; stderr?: string; killed?: boolean };
      // `timeout` renvoie 124 quand il coupe le processus.
      return {
        exitCode: typeof err.code === 'number' ? err.code : 1,
        stdout: err.stdout ?? '',
        stderr: err.stderr ?? String(error),
        timedOut: err.code === 124 || Boolean(err.killed),
      };
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Retire les clôtures Markdown autour d'un bloc de code. */
export function stripCodeFences(text: string): string {
  const fenced = [...text.matchAll(/```(?:python|py)?\s*\n([\s\S]*?)```/gi)];
  if (fenced.length > 0) return fenced[fenced.length - 1][1].trim();
  return text.trim();
}
