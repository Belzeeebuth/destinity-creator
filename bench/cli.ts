import { MODELS } from '../src/data/models';
import { aggregate, containsMock, renderScoresFile, writeScoresFile } from './export-scores';
import { sandboxAvailable } from './graders/sandbox';
import { evaluableModels, MOCK_MODELS, resolveModel } from './providers';
import { FatalError } from './providers/http';
import { runBenchmark } from './runner';
import { latestRunId, loadMeta, loadResults, listRunIds } from './store';
import { SUITES } from './suites';
import type { EffortLevel, RunConfig } from './types';

/* ── Analyse des arguments ───────────────────────────────────────────────── */

function parseArgs(argv: string[]) {
  const flags = new Map<string, string>();
  const positional: string[] = [];
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [key, ...rest] = arg.slice(2).split('=');
      flags.set(key, rest.length > 0 ? rest.join('=') : 'true');
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

function list(flags: Map<string, string>, key: string, fallback: string[]): string[] {
  const raw = flags.get(key);
  if (!raw || raw === 'true') return fallback;
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function number(flags: Map<string, string>, key: string, fallback: number): number {
  const raw = flags.get(key);
  if (!raw || raw === 'true') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new FatalError(`--${key} doit être un nombre (reçu « ${raw} »)`);
  return value;
}

/** Un plafond de 0,004 $ ne doit pas s'afficher « 0,00 $ ». */
function money(value: number): string {
  return value >= 0.01 ? value.toFixed(2) : value.toFixed(4);
}

/* ── Commandes ───────────────────────────────────────────────────────────── */

async function cmdList(): Promise<void> {
  console.log('Suites disponibles :');
  for (const suite of SUITES) {
    console.log(`  ${suite.id.padEnd(18)} ${String(suite.tasks.length).padStart(2)} tâches — ${suite.name}`);
  }

  console.log('\nModèles évaluables (identifiant d’API connu ou auto-hébergé) :');
  const evaluable = new Set(evaluableModels());
  for (const model of MODELS) {
    const mark = evaluable.has(model.slug) ? '✓' : '·';
    const why = evaluable.has(model.slug)
      ? model.selfHosted
        ? 'via Ollama'
        : (model.apiId ?? '')
      : 'identifiant d’API non vérifié';
    console.log(`  ${mark} ${model.slug.padEnd(24)} ${why}`);
  }

  console.log('\nModèles factices (validation du harness, sans réseau ni coût) :');
  console.log(`  ${MOCK_MODELS.join(', ')}`);
}

async function cmdDoctor(flags: Map<string, string>): Promise<void> {
  const models = list(flags, 'models', evaluableModels());
  console.log('Bac à sable de code :');
  const sandbox = await sandboxAvailable();
  console.log(`  ${sandbox.ok ? '✓' : '✗'} ${sandbox.detail}`);
  if (!sandbox.ok) {
    console.log('    → la suite int-code-python sera ignorée, jamais exécutée sur l’hôte.');
  }

  console.log('\nClés d’environnement :');
  const seen = new Set<string>();
  for (const slug of models) {
    let resolved;
    try {
      resolved = resolveModel(slug);
    } catch {
      continue;
    }
    const key = resolved.adapter.envKey;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const present = Boolean(process.env[key]);
    console.log(`  ${present ? '✓' : '✗'} ${key}${present ? '' : ' — absente'}`);
  }
  if (seen.size === 0) console.log('  (aucune clé requise pour cette sélection)');

  console.log('\nAccessibilité des modèles :');
  let reachable = 0;
  for (const slug of models) {
    try {
      const resolved = resolveModel(slug);
      const ping = await resolved.adapter.ping(resolved.apiId);
      if (ping.ok) reachable += 1;
      console.log(`  ${ping.ok ? '✓' : '✗'} ${slug.padEnd(24)} ${ping.detail}`);
    } catch (error) {
      console.log(`  ✗ ${slug.padEnd(24)} ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log(`\n${reachable}/${models.length} modèle(s) joignable(s).`);
  if (reachable === 0) {
    console.log('Aucun modèle joignable — un run réel échouerait. Essayez d’abord :');
    console.log('  npm run bench -- run --models=mock-strong,mock-mid,mock-weak --budget=5');
  }
}

async function cmdRun(flags: Map<string, string>): Promise<void> {
  const config: RunConfig = {
    models: list(flags, 'models', []),
    suites: list(flags, 'suites', SUITES.map((s) => s.id)),
    repeats: number(flags, 'repeats', 1),
    concurrency: number(flags, 'concurrency', 4),
    budgetUsd: number(flags, 'budget', 2),
    maxTokens: number(flags, 'max-tokens', 4096),
    effort: (flags.get('effort') as EffortLevel | undefined) ?? undefined,
    dryRun: flags.get('dry-run') === 'true',
    allowUnpriced: flags.get('allow-unpriced') === 'true',
  };

  if (config.models.length === 0) {
    throw new FatalError(
      '--models est obligatoire. Ex. : --models=claude-opus-5,claude-haiku-4-5 ' +
        '(ou --models=mock-strong,mock-mid,mock-weak pour un essai à blanc).',
    );
  }

  const started = Date.now();
  const outcome = await runBenchmark(config, {
    onNotice: (message) => console.log(`  · ${message}`),
    onProgress: (done, total, result) => {
      const icon =
        result.grade.status === 'pass'
          ? '✓'
          : result.grade.status === 'fail'
            ? '✗'
            : result.grade.status === 'skipped'
              ? '–'
              : '!';
      const label = `${result.modelSlug}/${result.suiteId}/${result.taskId}`;
      console.log(
        `[${String(done).padStart(4)}/${total}] ${icon} ${label.padEnd(52)} ${result.grade.detail.slice(0, 70)}`,
      );
    },
  });

  if (config.dryRun) return;

  const { counts, spentUsd, stoppedReason } = outcome.meta;
  console.log(`\nRun ${outcome.runId} — ${((Date.now() - started) / 1000).toFixed(1)} s`);
  console.log(
    `  ${counts.pass} réussite(s) · ${counts.fail} échec(s) · ${counts.skipped} ignorée(s) · ` +
      `${counts.error} erreur(s) · ${counts.refused} refus`,
  );
  console.log(`  Dépense : ${spentUsd.toFixed(4)} $ sur un plafond de ${money(config.budgetUsd)} $`);
  if (stoppedReason) console.log(`  ⚠ Run interrompu : ${stoppedReason}`);
  console.log(`  Traces : bench/runs/${outcome.runId}/results.jsonl`);
  console.log('\nPour publier ces scores sur le site : npm run bench:export');
}

async function cmdReport(flags: Map<string, string>): Promise<void> {
  const runId = flags.get('run') ?? (await latestRunId());
  if (!runId) throw new FatalError('aucun run trouvé dans bench/runs/');
  const results = await loadResults(runId);
  const meta = await loadMeta(runId);
  if (results.length === 0) throw new FatalError(`run ${runId} vide ou introuvable`);

  console.log(`Run ${runId}${meta ? ` — ${meta.counts.total} appels, ${meta.spentUsd.toFixed(4)} $` : ''}\n`);
  const rows = aggregate(results);
  const suites = [...new Set(rows.map((r) => r.suiteId))].sort();
  const models = [...new Set(rows.map((r) => r.modelSlug))].sort();

  const width = Math.max(...models.map((m) => m.length), 8);
  console.log(`${'modèle'.padEnd(width)}  ${suites.map((s) => s.padStart(16)).join('')}`);
  for (const model of models) {
    const cells = suites.map((suiteId) => {
      const row = rows.find((r) => r.modelSlug === model && r.suiteId === suiteId);
      return (row ? `${row.value.toFixed(1)} (${row.graded})` : 'n/d').padStart(16);
    });
    console.log(`${model.padEnd(width)}  ${cells.join('')}`);
  }
  console.log('\nEntre parenthèses : nombre de tâches réellement notées.');

  const excluded = rows.filter((r) => r.excluded > 0);
  if (excluded.length > 0) {
    console.log('\nTâches sorties du dénominateur (jamais comptées comme des échecs) :');
    for (const row of excluded) {
      console.log(`  ${row.modelSlug}/${row.suiteId} : ${row.excluded}`);
    }
  }
}

async function cmdExport(flags: Map<string, string>): Promise<void> {
  const runId = flags.get('run') ?? (await latestRunId());
  if (!runId) throw new FatalError('aucun run trouvé dans bench/runs/');
  const results = await loadResults(runId);
  const meta = await loadMeta(runId);
  if (!meta || results.length === 0) throw new FatalError(`run ${runId} vide ou introuvable`);

  if (containsMock(results)) {
    throw new FatalError(
      `le run ${runId} contient des modèles factices — ils n'ont aucune valeur de mesure ` +
        `et ne doivent pas alimenter le site. Relancez sur de vrais modèles.`,
    );
  }

  const rows = aggregate(results);
  if (rows.length === 0) throw new FatalError('aucun score exploitable dans ce run');

  const path = await writeScoresFile(renderScoresFile(rows, meta));
  console.log(`${rows.length} score(s) écrit(s) dans ${path}`);
  console.log('SCORES_ARE_ILLUSTRATIVE passe à false : le bandeau du site disparaît.');
  console.log('\nÀ vérifier avant publication : npm run lint && npm run build');
}

async function cmdRuns(): Promise<void> {
  const ids = await listRunIds();
  if (ids.length === 0) {
    console.log('Aucun run enregistré.');
    return;
  }
  for (const id of ids) {
    const meta = await loadMeta(id);
    console.log(
      `  ${id}  ${meta ? `${meta.counts.total} appels · ${meta.spentUsd.toFixed(4)} $ · ${meta.models.join(',')}` : ''}`,
    );
  }
}

const USAGE = `bench — harness d'évaluation

  npm run bench -- list
  npm run bench -- doctor [--models=a,b]
  npm run bench -- run --models=a,b [--suites=…] [--repeats=1] [--concurrency=4]
                       [--budget=2] [--max-tokens=4096] [--effort=low|medium|high]
                       [--dry-run] [--allow-unpriced]
  npm run bench -- report [--run=<id>]
  npm run bench -- export [--run=<id>]
  npm run bench -- runs
  npm run bench -- selftest

Essai sans clé ni dépense :
  npm run bench -- run --models=mock-strong,mock-mid,mock-weak --budget=5
`;

async function main(): Promise<void> {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const command = positional[0] ?? 'help';
  switch (command) {
    case 'list':
      return cmdList();
    case 'doctor':
      return cmdDoctor(flags);
    case 'run':
      return cmdRun(flags);
    case 'report':
      return cmdReport(flags);
    case 'export':
      return cmdExport(flags);
    case 'runs':
      return cmdRuns();
    case 'selftest':
      await import('./selftest');
      return;
    default:
      console.log(USAGE);
  }
}

main().catch((error) => {
  console.error(`\nErreur : ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
