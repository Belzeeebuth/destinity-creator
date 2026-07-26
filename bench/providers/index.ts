import { MODELS } from '../../src/data/models';
import type { Pricing } from '../../src/data/types';
import type { ProviderAdapter } from '../types';
import { anthropicAdapter } from './anthropic';
import { googleAdapter } from './google';
import { FatalError } from './http';
import { isMockModel, mockAdapter } from './mock';
import { ollamaAdapter } from './ollama';
import { mistralAdapter, openaiAdapter } from './openai-compatible';

export interface ResolvedModel {
  slug: string;
  /** Identifiant réellement envoyé à l'API. */
  apiId: string;
  providerId: string;
  adapter: ProviderAdapter;
  pricing: Pricing;
  /** Tourne en local : ni clé ni coût au token. */
  local: boolean;
}

const BY_PROVIDER: Record<string, ProviderAdapter> = {
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
  google: googleAdapter,
  mistral: mistralAdapter,
};

const MOCK_PRICING: Pricing = { input: 1, output: 5, note: 'tarif fictif' };

/**
 * Associe un slug du catalogue à l'adaptateur qui sait lui parler.
 *
 * Un modèle marqué `selfHosted` passe par Ollama et n'a pas de tarif au token.
 * Un modèle sans `apiId` vérifié est refusé : on n'invente pas une chaîne qui
 * renverra une 404 au bout de trente requêtes.
 */
export function resolveModel(slug: string): ResolvedModel {
  if (isMockModel(slug)) {
    return {
      slug,
      apiId: slug,
      providerId: 'mock',
      adapter: mockAdapter,
      pricing: MOCK_PRICING,
      local: true,
    };
  }

  const model = MODELS.find((entry) => entry.slug === slug);
  if (!model) throw new FatalError(`modèle inconnu du catalogue : ${slug}`);

  if (model.selfHosted) {
    const apiId = model.apiId ?? slug;
    return {
      slug,
      apiId,
      providerId: 'ollama',
      adapter: ollamaAdapter,
      pricing: { input: null, output: null },
      local: true,
    };
  }

  if (!model.apiId) {
    throw new FatalError(
      `${slug} n'a pas d'identifiant d'API vérifié dans src/data/models.ts — ` +
        `renseignez \`apiId\` avant de lancer une évaluation sur ce modèle`,
    );
  }

  const adapter = BY_PROVIDER[model.provider];
  if (!adapter) {
    throw new FatalError(`aucun adaptateur pour le fournisseur ${model.provider} (${slug})`);
  }

  return {
    slug,
    apiId: model.apiId,
    providerId: model.provider,
    adapter,
    pricing: model.pricing,
    local: false,
  };
}

/** Slugs évaluables sans intervention : identifiant d'API connu ou auto-hébergé. */
export function evaluableModels(): string[] {
  return MODELS.filter((model) => model.apiId !== null || model.selfHosted).map((m) => m.slug);
}

export const MOCK_MODELS = ['mock-strong', 'mock-mid', 'mock-weak', 'mock-refuser'];
