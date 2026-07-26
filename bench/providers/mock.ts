import type { ChatRequest, ChatResponse, PingResult, ProviderAdapter, ToolCall } from '../types';

/**
 * Fournisseur factice, déterministe, sans réseau ni clé.
 *
 * Il n'existe que pour valider le harness lui-même — runner, graders, plafond
 * de budget, stockage, export — sans dépenser un centime. Ses « scores » ne
 * veulent rien dire et l'export refuse d'écrire un fichier de scores qui en
 * contiendrait.
 */

export interface MockOracle {
  answer: string;
  toolCalls?: ToolCall[];
}

const oracles = new Map<string, MockOracle>();

/** Le runner dépose la bonne réponse ici avant d'appeler le modèle factice. */
export function registerMockOracle(promptHash: string, oracle: MockOracle): void {
  oracles.set(promptHash, oracle);
}

export function isMockModel(slug: string): boolean {
  return slug.startsWith('mock-');
}

/**
 * Clé d'oracle : le runner et le fournisseur factice doivent la calculer
 * exactement pareil. Une seule implémentation, donc aucune dérive possible.
 */
export function mockKey(request: Pick<ChatRequest, 'system' | 'user'>): string {
  return `${request.system ?? ''} ${request.user}`;
}

/** Taux de réussite visé par modèle factice — de quoi produire un classement. */
const ACCURACY: Record<string, number> = {
  'mock-strong': 0.92,
  'mock-mid': 0.62,
  'mock-weak': 0.28,
  'mock-refuser': 0.5,
};

/** Hachage déterministe : le même run rejoué donne exactement le même résultat. */
function unitHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

export const mockAdapter: ProviderAdapter = {
  id: 'mock',
  envKey: null,

  async ping(apiId: string): Promise<PingResult> {
    return ACCURACY[apiId] === undefined
      ? { ok: false, detail: `modèle factice inconnu : ${apiId}` }
      : { ok: true, detail: `factice, réussite visée ${Math.round(ACCURACY[apiId] * 100)} %` };
  },

  async chat(apiId: string, request: ChatRequest): Promise<ChatResponse> {
    const accuracy = ACCURACY[apiId] ?? 0.5;
    // La clé de l'oracle est l'empreinte du prompt, déposée par le runner.
    const key = mockKey(request);
    const promptHash = hashKey(key);
    const oracle = oracles.get(promptHash);
    const roll = unitHash(`${apiId}:${promptHash}`);

    if (apiId === 'mock-refuser' && roll > 0.85) {
      return {
        text: '',
        toolCalls: [],
        usage: { inputTokens: Math.ceil(key.length / 4), outputTokens: 0 },
        refused: true,
        stopReason: 'refusal',
        latencyMs: 5,
      };
    }

    const correct = roll < accuracy;
    const text = correct
      ? (oracle?.answer ?? 'FINAL: (oracle absent)')
      : `FINAL: ${wrongAnswer(oracle?.answer ?? '', promptHash)}`;
    const toolCalls = correct ? (oracle?.toolCalls ?? []) : [];

    return {
      text,
      toolCalls,
      usage: {
        inputTokens: Math.ceil(key.length / 4),
        outputTokens: Math.ceil(text.length / 4),
      },
      refused: false,
      stopReason: 'end_turn',
      latencyMs: 5,
    };
  },
};

/** Doit rester identique au calcul d'empreinte du runner. */
export function hashKey(value: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (((h2 >>> 0) * 4294967296 + (h1 >>> 0)) >>> 0).toString(16).padStart(8, '0');
}

function wrongAnswer(right: string, seed: string): string {
  const alternatives = ['42', 'inconnu', 'null', 'peut-être', '0'];
  const pick = alternatives[Math.floor(unitHash(seed) * alternatives.length)];
  return pick === right ? 'réponse erronée' : pick;
}
