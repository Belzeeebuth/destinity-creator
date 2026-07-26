import type { ChatRequest, ChatResponse, PingResult, ProviderAdapter, ToolCall } from '../types';
import { FatalError, httpJson, requireEnv } from './http';

interface ChatCompletionResponse {
  choices?: {
    message?: {
      content?: string | null;
      tool_calls?: { function?: { name?: string; arguments?: string } }[];
    };
    finish_reason?: string;
  }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/**
 * Adaptateur pour toute API au format « chat completions » d'OpenAI — utilisé
 * tel quel par OpenAI et par Mistral, qui expose le même contrat.
 */
export function createOpenAICompatibleAdapter(options: {
  id: ProviderAdapter['id'];
  baseUrl: string;
  envKey: string;
}): ProviderAdapter {
  const { id, baseUrl, envKey } = options;

  return {
    id,
    envKey,

    async ping(apiId: string): Promise<PingResult> {
      try {
        const key = requireEnv(envKey);
        const model = await httpJson<{ id?: string }>({
          url: `${baseUrl}/models/${encodeURIComponent(apiId)}`,
          method: 'GET',
          headers: { authorization: `Bearer ${key}` },
          timeoutMs: 20_000,
        });
        return { ok: true, detail: model.id ?? apiId };
      } catch (error) {
        return { ok: false, detail: error instanceof Error ? error.message : String(error) };
      }
    },

    async chat(apiId: string, request: ChatRequest): Promise<ChatResponse> {
      const key = requireEnv(envKey);
      const startedAt = Date.now();

      const messages: { role: string; content: string }[] = [];
      if (request.system) messages.push({ role: 'system', content: request.system });
      messages.push({ role: 'user', content: request.user });

      const base: Record<string, unknown> = {
        model: apiId,
        messages,
        ...(request.tools?.length
          ? {
              tools: request.tools.map((tool) => ({
                type: 'function',
                function: {
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.parameters,
                },
              })),
            }
          : {}),
      };

      // Les modèles à raisonnement veulent `max_completion_tokens`, les plus
      // anciens `max_tokens`. On tente le premier et on bascule si le serveur
      // se plaint explicitement du nom du paramètre.
      let response: ChatCompletionResponse;
      try {
        response = await httpJson<ChatCompletionResponse>({
          url: `${baseUrl}/chat/completions`,
          headers: { authorization: `Bearer ${key}` },
          body: { ...base, max_completion_tokens: request.maxTokens },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const wrongParam =
          error instanceof FatalError && /max_completion_tokens|max_tokens/i.test(message);
        if (!wrongParam) throw error;
        response = await httpJson<ChatCompletionResponse>({
          url: `${baseUrl}/chat/completions`,
          headers: { authorization: `Bearer ${key}` },
          body: { ...base, max_tokens: request.maxTokens },
        });
      }

      const choice = response.choices?.[0];
      const toolCalls: ToolCall[] = (choice?.message?.tool_calls ?? []).map((call) => {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function?.arguments ?? '{}') as Record<string, unknown>;
        } catch {
          // Arguments non parsables : on les laisse vides, le grader jugera.
        }
        return { name: call.function?.name ?? '', arguments: args };
      });

      const finish = choice?.finish_reason ?? null;
      return {
        text: (choice?.message?.content ?? '').trim(),
        toolCalls,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
        refused: finish === 'content_filter',
        stopReason: finish,
        latencyMs: Date.now() - startedAt,
      };
    },
  };
}

export const openaiAdapter = createOpenAICompatibleAdapter({
  id: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  envKey: 'OPENAI_API_KEY',
});

export const mistralAdapter = createOpenAICompatibleAdapter({
  id: 'mistral',
  baseUrl: 'https://api.mistral.ai/v1',
  envKey: 'MISTRAL_API_KEY',
});
