import { aggregate, renderScoresFile } from './export-scores';
import { extractFinal, extractJson, grade } from './graders';
import type { ChatResponse, Grade, RunMeta, TaskResult } from './types';

/**
 * Auto-test du harness : verrouille les règles qui décident d'un score.
 *
 * Ce sont exactement les endroits où une erreur passerait inaperçue — un
 * `skipped` compté comme un zéro, une tâche répétée qui pèse double — et qui
 * fausseraient tout le classement sans jamais lever d'exception.
 */

let failures = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(
    `  ${ok ? '✓' : '✗'} ${label}${ok ? '' : `\n      attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`}`,
  );
}

function result(over: Partial<TaskResult> & Pick<TaskResult, 'taskId' | 'grade'>): TaskResult {
  return {
    runId: 'test',
    modelSlug: 'model-a',
    providerId: 'test',
    apiId: 'test',
    suiteId: 'int-reasoning',
    repeat: 1,
    usage: { inputTokens: 10, outputTokens: 10 },
    costUsd: 0,
    latencyMs: 1,
    refused: false,
    output: '',
    toolCalls: [],
    promptHash: 'h',
    startedAt: '2027-01-01T00:00:00.000Z',
    ...over,
  };
}

const pass: Grade = { status: 'pass', score: 1, detail: '' };
const fail: Grade = { status: 'fail', score: 0, detail: '' };
const skipped: Grade = { status: 'skipped', score: 0, detail: '' };
const errored: Grade = { status: 'error', score: 0, detail: '' };

function response(over: Partial<ChatResponse> = {}): ChatResponse {
  return {
    text: '',
    toolCalls: [],
    usage: { inputTokens: 0, outputTokens: 0 },
    refused: false,
    stopReason: 'end_turn',
    latencyMs: 1,
    ...over,
  };
}

async function main(): Promise<void> {
  console.log('Agrégation');

  check(
    'moitié réussie → 50',
    aggregate([
      result({ taskId: 't1', grade: pass }),
      result({ taskId: 't2', grade: pass }),
      result({ taskId: 't3', grade: fail }),
      result({ taskId: 't4', grade: fail }),
    ])[0].value,
    50,
  );

  const withSkips = aggregate([
    result({ taskId: 't1', grade: pass }),
    result({ taskId: 't2', grade: pass }),
    result({ taskId: 't3', grade: skipped }),
    result({ taskId: 't4', grade: errored }),
  ])[0];
  check('une tâche ignorée ne compte pas comme un échec', withSkips.value, 100);
  check('les tâches ignorées sortent du dénominateur', withSkips.graded, 2);
  check('les exclusions sont rapportées', withSkips.excluded, 2);

  check(
    'les passes d’une tâche répétée sont moyennées avant les tâches',
    // t1 : 1 réussite sur 2 passes (0,5) ; t2 : 1 échec (0) → moyenne 0,25
    aggregate([
      result({ taskId: 't1', repeat: 1, grade: pass }),
      result({ taskId: 't1', repeat: 2, grade: fail }),
      result({ taskId: 't2', repeat: 1, grade: fail }),
    ])[0].value,
    25,
  );

  check(
    'les refus sont comptés à part',
    aggregate([
      result({ taskId: 't1', grade: fail, refused: true }),
      result({ taskId: 't2', grade: pass }),
    ])[0].refusals,
    1,
  );

  check(
    'aucun score quand rien n’est notable',
    aggregate([result({ taskId: 't1', grade: skipped })]).length,
    0,
  );

  console.log('\nExtraction');
  check('dernière ligne FINAL retenue', extractFinal('FINAL: a\nblabla\nFINAL: b'), 'b');
  check('sans marqueur, texte entier', extractFinal('  42  '), '42');
  check('JSON dans un bloc clôturé', extractJson('bla\n```json\n{"a":1}\n```'), { a: 1 });
  check('JSON nu en fin de texte', extractJson('voici : [1,2,3]'), [1, 2, 3]);

  console.log('\nNotation');
  check(
    'exact insensible à la casse et à la ponctuation finale',
    (await grade({ kind: 'exact', expected: 'Canberra' }, response({ text: 'FINAL: canberra.' })))
      .status,
    'pass',
  );
  check(
    'exact sensible à la casse quand demandé',
    (
      await grade(
        { kind: 'exact', expected: 'JP', caseSensitive: true },
        response({ text: 'FINAL: jp' }),
      )
    ).status,
    'fail',
  );
  check(
    'regex ciblant la ligne FINAL',
    (
      await grade(
        { kind: 'regex', pattern: '^[A-Z]+$', flags: '', target: 'final' },
        response({ text: 'du texte\nFINAL: OCEAN' }),
      )
    ).status,
    'pass',
  );
  check(
    'regex en négatif (mot interdit)',
    (
      await grade(
        { kind: 'regex', pattern: '\\bchats?\\b', expectMatch: false },
        response({ text: 'un félin domestique' }),
      )
    ).status,
    'pass',
  );
  check(
    'JSON comparé en profondeur, ordre des clés indifférent',
    (
      await grade(
        { kind: 'json', expected: { a: 1, b: [2, 3] } },
        response({ text: '```json\n{"b":[2,3],"a":1}\n```' }),
      )
    ).status,
    'pass',
  );
  check(
    'appel d’outil : arguments comparés en sous-ensemble',
    (
      await grade(
        { kind: 'tool-call', expected: [{ name: 'get_weather', arguments: { city: 'Lyon' } }] },
        response({ toolCalls: [{ name: 'get_weather', arguments: { city: 'Lyon', unit: 'celsius' } }] }),
      )
    ).status,
    'pass',
  );
  check(
    'appel d’outil attendu vide : ne rien appeler est la bonne réponse',
    (await grade({ kind: 'tool-call', expected: [] }, response({ toolCalls: [] }))).status,
    'pass',
  );
  check(
    'un refus n’est jamais une réussite',
    (await grade({ kind: 'exact', expected: 'x' }, response({ text: 'FINAL: x', refused: true })))
      .status,
    'fail',
  );
  check(
    'juge LLM ignoré faute de juge disponible',
    (await grade({ kind: 'llm-judge', rubric: 'r', judges: [] }, response())).status,
    'skipped',
  );

  console.log('\nGénération du fichier de scores');
  const meta: RunMeta = {
    runId: 'run-test',
    startedAt: '2027-01-01T00:00:00.000Z',
    finishedAt: '2027-01-01T00:05:00.000Z',
    harnessVersion: 'test',
    models: ['model-a'],
    suites: ['int-reasoning'],
    repeats: 1,
    maxTokens: 1024,
    budgetUsd: 1,
    spentUsd: 0.12,
    stoppedReason: null,
    counts: { total: 2, pass: 1, fail: 1, skipped: 0, error: 0, refused: 0 },
  };
  const rendered = renderScoresFile(
    aggregate([result({ taskId: 't1', grade: pass }), result({ taskId: 't2', grade: fail })]),
    meta,
  );
  check(
    'le drapeau illustratif est désactivé',
    rendered.includes('SCORES_ARE_ILLUSTRATIVE = false'),
    true,
  );
  check('la provenance est « measured »', rendered.includes("provenance: 'measured'"), true);
  check('la date de mesure est portée', rendered.includes('"2027-01-01"'), true);
  check('les traces sont référencées', rendered.includes('bench/runs/run-test'), true);

  console.log(failures === 0 ? '\nTout passe.' : `\n${failures} vérification(s) en échec.`);
  if (failures > 0) process.exitCode = 1;
}

main();
