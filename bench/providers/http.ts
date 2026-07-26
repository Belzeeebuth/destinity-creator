/** Erreur qu'il vaut la peine de réessayer : quota, surcharge, panne réseau. */
export class RetryableError extends Error {
  constructor(
    message: string,
    /** Délai conseillé par le serveur, en secondes. */
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'RetryableError';
  }
}

/** Erreur définitive : requête invalide, modèle inconnu, clé refusée. */
export class FatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalError';
  }
}

function classify(status: number, body: string): Error {
  if (status === 429 || status >= 500) {
    return new RetryableError(`HTTP ${status} — ${body.slice(0, 300)}`);
  }
  return new FatalError(`HTTP ${status} — ${body.slice(0, 300)}`);
}

export interface JsonRequest {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

/**
 * Appel JSON avec délai maximal réel. Attention : un timeout `fetch` porte sur
 * la requête entière ici, via AbortController — c'est voulu, un flux qui arrive
 * au compte-gouttes ne doit pas bloquer indéfiniment le harness.
 */
export async function httpJson<T>({
  url,
  method = 'POST',
  headers = {},
  body,
  timeoutMs = 120_000,
}: JsonRequest): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      const retryAfter = response.headers.get('retry-after');
      const error = classify(response.status, text);
      if (error instanceof RetryableError && retryAfter) {
        const seconds = Number(retryAfter);
        if (Number.isFinite(seconds)) {
          return Promise.reject(new RetryableError(error.message, seconds));
        }
      }
      throw error;
    }

    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch (error) {
    if (error instanceof FatalError || error instanceof RetryableError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new RetryableError(`délai dépassé après ${timeoutMs} ms`);
    }
    // Panne réseau, DNS, TLS : réessayable.
    throw new RetryableError(error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timer);
  }
}

/** Lit une clé d'environnement ou explique précisément ce qui manque. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new FatalError(
      `variable d'environnement ${name} absente — exportez-la avant de lancer le run`,
    );
  }
  return value;
}
