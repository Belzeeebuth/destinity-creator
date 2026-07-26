import Anthropic from '@anthropic-ai/sdk';
import type { ChatRequest, ChatResponse, PingResult, ProviderAdapter, ToolCall } from '../types';
import { FatalError, RetryableError } from './http';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    // Le constructeur sans argument résout ANTHROPIC_API_KEY, puis
    // ANTHROPIC_AUTH_TOKEN, puis un profil `ant auth login`.
    client = new Anthropic({ maxRetries: 0 }); // les réessais sont pilotés par le runner
  }
  return client;
}

function wrap(error: unknown): Error {
  const status = (error as { status?: number })?.status;
  const message = error instanceof Error ? error.message : String(error);
  if (status === 429 || (typeof status === 'number' && status >= 500)) {
    return new RetryableError(`Anthropic ${status} — ${message}`);
  }
  if (status === undefined) return new RetryableError(`Anthropic — ${message}`);
  return new FatalError(`Anthropic ${status} — ${message}`);
}

export const anthropicAdapter: ProviderAdapter = {
  id: 'anthropic',
  envKey: 'ANTHROPIC_API_KEY',

  /** L'API Models valide la clé et l'identifiant sans consommer de token. */
  async ping(apiId: string): Promise<PingResult> {
    try {
      const model = await getClient().models.retrieve(apiId);
      return { ok: true, detail: `${model.id} — ${model.display_name}` };
    } catch (error) {
      return { ok: false, detail: wrap(error).message };
    }
  },

  async chat(apiId: string, request: ChatRequest): Promise<ChatResponse> {
    const startedAt = Date.now();
    try {
      // `temperature` / `top_p` / `budget_tokens` sont refusés (400) sur les
      // modèles courants : on ne les envoie pas. Le mode de raisonnement reste
      // celui du modèle par défaut ; l'effort seul est piloté ici.
      const response = await getClient().messages.create({
        model: apiId,
        max_tokens: request.maxTokens,
        ...(request.system ? { system: request.system } : {}),
        ...(request.effort ? { output_config: { effort: request.effort } } : {}),
        ...(request.tools?.length
          ? {
              tools: request.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.parameters as Anthropic.Tool.InputSchema,
              })),
            }
          : {}),
        messages: [{ role: 'user', content: request.user }],
      });

      const texts: string[] = [];
      const toolCalls: ToolCall[] = [];
      for (const block of response.content) {
        if (block.type === 'text') texts.push(block.text);
        else if (block.type === 'tool_use') {
          toolCalls.push({
            name: block.name,
            arguments: (block.input ?? {}) as Record<string, unknown>,
          });
        }
      }

      return {
        text: texts.join('\n').trim(),
        toolCalls,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        // Un refus n'est pas une erreur HTTP : il arrive en 200 avec ce motif.
        refused: response.stop_reason === 'refusal',
        stopReason: response.stop_reason,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      throw wrap(error);
    }
  },
};
