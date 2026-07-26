import type { ChatResponse, Grade, GraderSpec, ToolCall } from '../types';
import { runPythonCheck, sandboxAvailable, stripCodeFences } from './sandbox';

/**
 * Convention de réponse : chaque tâche demande au modèle de terminer par une
 * ligne `FINAL: <réponse>`. On extrait la dernière occurrence, ce qui laisse le
 * modèle raisonner à voix haute sans casser la notation.
 */
export const FINAL_MARKER_INSTRUCTION =
  'Termine impérativement ta réponse par une dernière ligne au format exact ' +
  '`FINAL: <réponse>`, sans rien après.';

export function extractFinal(text: string): string {
  const matches = [...text.matchAll(/^[^\S\n]*FINAL\s*:[^\S\n]*(.*)$/gim)];
  if (matches.length > 0) return matches[matches.length - 1][1].trim();
  return text.trim();
}

/** Dernier objet ou tableau JSON du texte, clôtures Markdown comprises. */
export function extractJson(text: string): unknown {
  const fenced = [...text.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/gi)];
  const candidates = fenced.map((m) => m[1]);

  // À défaut de bloc clôturé, on remonte depuis la fin jusqu'à un JSON valide.
  for (let start = text.length - 1; start >= 0; start -= 1) {
    const char = text[start];
    if (char !== '{' && char !== '[') continue;
    const closing = char === '{' ? '}' : ']';
    const end = text.lastIndexOf(closing);
    if (end > start) candidates.push(text.slice(start, end + 1));
  }

  for (const candidate of candidates.reverse()) {
    try {
      return JSON.parse(candidate.trim());
    } catch {
      // On essaie le candidat suivant.
    }
  }
  return undefined;
}

function normalize(value: string, caseSensitive: boolean): string {
  const trimmed = value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^["'`]|["'`.]$/g, '')
    .trim();
  return caseSensitive ? trimmed : trimmed.toLocaleLowerCase('fr');
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  }
  if (typeof a === 'object') {
    const ka = Object.keys(a as object).sort();
    const kb = Object.keys(b as object).sort();
    if (ka.length !== kb.length || ka.some((key, i) => key !== kb[i])) return false;
    return ka.every((key) =>
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
    );
  }
  return false;
}

/** Les arguments attendus sont comparés en sous-ensemble : l'extra est toléré. */
function argumentsMatch(actual: Record<string, unknown>, expected?: Record<string, unknown>) {
  if (!expected) return true;
  return Object.entries(expected).every(([key, value]) => deepEqual(actual[key], value));
}

function gradeToolCalls(
  calls: ToolCall[],
  spec: Extract<GraderSpec, { kind: 'tool-call' }>,
): Grade {
  if (!spec.allowExtra && calls.length !== spec.expected.length) {
    return {
      status: 'fail',
      score: 0,
      detail: `${calls.length} appel(s) d'outil, ${spec.expected.length} attendu(s)`,
    };
  }
  if (calls.length < spec.expected.length) {
    return {
      status: 'fail',
      score: 0,
      detail: `séquence trop courte : ${calls.length} < ${spec.expected.length}`,
    };
  }
  for (let i = 0; i < spec.expected.length; i += 1) {
    const want = spec.expected[i];
    const got = calls[i];
    if (got.name !== want.name) {
      return {
        status: 'fail',
        score: 0,
        detail: `appel ${i + 1} : « ${got.name} » au lieu de « ${want.name} »`,
      };
    }
    if (!argumentsMatch(got.arguments, want.arguments)) {
      return {
        status: 'fail',
        score: 0,
        detail: `appel ${i + 1} (${want.name}) : arguments incorrects — ${JSON.stringify(got.arguments)}`,
      };
    }
  }
  return { status: 'pass', score: 1, detail: 'séquence d’appels conforme' };
}

export interface GradeContext {
  /** Appelle un modèle juge. Absent → les tâches `llm-judge` sont ignorées. */
  callJudge?: (modelSlug: string, prompt: string) => Promise<string>;
}

export async function grade(
  spec: GraderSpec,
  response: ChatResponse,
  context: GradeContext = {},
): Promise<Grade> {
  // Un refus n'est pas une bonne réponse, mais on veut le distinguer d'une
  // erreur de raisonnement — le runner le compte à part.
  if (response.refused) {
    return { status: 'fail', score: 0, detail: 'le modèle a refusé de répondre' };
  }

  switch (spec.kind) {
    case 'exact': {
      const caseSensitive = spec.caseSensitive ?? false;
      const got = normalize(extractFinal(response.text), caseSensitive);
      const want = normalize(spec.expected, caseSensitive);
      return got === want
        ? { status: 'pass', score: 1, detail: `« ${got} »` }
        : { status: 'fail', score: 0, detail: `attendu « ${want} », obtenu « ${got} »` };
    }

    case 'regex': {
      const expectMatch = spec.expectMatch ?? true;
      const subject =
        (spec.target ?? 'full') === 'final' ? extractFinal(response.text) : response.text;
      const matched = new RegExp(spec.pattern, spec.flags ?? 'i').test(subject);
      return matched === expectMatch
        ? { status: 'pass', score: 1, detail: `motif ${expectMatch ? 'trouvé' : 'absent'}` }
        : {
            status: 'fail',
            score: 0,
            detail: `motif /${spec.pattern}/ ${expectMatch ? 'introuvable' : 'présent'}`,
          };
    }

    case 'json': {
      const parsed = extractJson(response.text);
      if (parsed === undefined) {
        return { status: 'fail', score: 0, detail: 'aucun JSON exploitable dans la réponse' };
      }
      return deepEqual(parsed, spec.expected)
        ? { status: 'pass', score: 1, detail: 'JSON conforme' }
        : {
            status: 'fail',
            score: 0,
            detail: `JSON différent — obtenu ${JSON.stringify(parsed).slice(0, 200)}`,
          };
    }

    case 'tool-call':
      return gradeToolCalls(response.toolCalls, spec);

    case 'python': {
      const sandbox = await sandboxAvailable();
      if (!sandbox.ok) {
        return { status: 'skipped', score: 0, detail: `bac à sable indisponible — ${sandbox.detail}` };
      }
      const code = stripCodeFences(response.text);
      if (!code) return { status: 'fail', score: 0, detail: 'aucun code dans la réponse' };
      const result = await runPythonCheck(code, spec.tests);
      if (result.exitCode === 0) return { status: 'pass', score: 1, detail: 'tests passés' };
      if (result.timedOut) {
        return { status: 'fail', score: 0, detail: 'délai dépassé dans le bac à sable' };
      }
      return {
        status: 'fail',
        score: 0,
        detail: `tests en échec — ${(result.stderr || result.stdout).trim().split('\n').slice(-3).join(' / ').slice(0, 300)}`,
      };
    }

    case 'llm-judge': {
      if (!context.callJudge || spec.judges.length === 0) {
        return { status: 'skipped', score: 0, detail: 'aucun modèle juge disponible' };
      }
      const prompt =
        `Tu notes une réponse selon une grille. Réponds uniquement par un entier de 0 à 100.\n\n` +
        `GRILLE :\n${spec.rubric}\n\nRÉPONSE À NOTER :\n${response.text}\n\n` +
        `Termine par une ligne \`FINAL: <note>\`.`;

      const notes: number[] = [];
      for (const judge of spec.judges) {
        try {
          const raw = await context.callJudge(judge, prompt);
          const value = Number.parseFloat(extractFinal(raw).replace(',', '.'));
          if (Number.isFinite(value)) notes.push(Math.min(100, Math.max(0, value)));
        } catch {
          // Un juge indisponible ne doit pas faire échouer la tâche.
        }
      }
      if (notes.length === 0) {
        return { status: 'skipped', score: 0, detail: 'aucun juge n’a pu être interrogé' };
      }
      // Médiane plutôt que moyenne : un juge aberrant ne déplace pas la note.
      notes.sort((a, b) => a - b);
      const median =
        notes.length % 2 === 1
          ? notes[(notes.length - 1) / 2]
          : (notes[notes.length / 2 - 1] + notes[notes.length / 2]) / 2;
      return {
        status: median >= 50 ? 'pass' : 'fail',
        score: median / 100,
        detail: `médiane ${median}/100 sur ${notes.length} juge(s)`,
      };
    }

    default: {
      const exhaustive: never = spec;
      return { status: 'error', score: 0, detail: `grader inconnu : ${JSON.stringify(exhaustive)}` };
    }
  }
}
