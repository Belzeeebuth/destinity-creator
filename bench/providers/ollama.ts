import type { ChatRequest, ChatResponse, PingResult, ProviderAdapter, ToolCall } from '../types';
import { httpJson } from './http';

/** Ollama tourne en local : pas de clé, pas de coût au token. */
function baseUrl(): string {
  const host = process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';
  return host.startsWith('http') ? host.replace(/\/$/, '') : `http://${host}`;
}

interface OllamaChatResponse {
  message?: {
    content?: string;
    tool_calls?: { function?: { name?: string; arguments?: Record<string, unknown> } }[];
  };
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

export const ollamaAdapter: ProviderAdapter = {
  id: 'meta', // catégorie « poids ouverts » ; le slug du modèle décide du reste
  envKey: null,

  async ping(apiId: string): Promise<PingResult> {
    try {
      const tags = await httpJson<{ models?: { name?: string }[] }>({
        url: `${baseUrl()}/api/tags`,
        method: 'GET',
        timeoutMs: 10_000,
      });
      const names = (tags.models ?? []).map((m) => m.name ?? '');
      const present = names.some((name) => name === apiId || name.startsWith(`${apiId}:`));
      return present
        ? { ok: true, detail: `${apiId} disponible localement` }
        : {
            ok: false,
            detail: `modèle absent du serveur Ollama — \`ollama pull ${apiId}\` (présents : ${names.join(', ') || 'aucun'})`,
          };
    } catch (error) {
      return {
        ok: false,
        detail: `serveur Ollama injoignable sur ${baseUrl()} — ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  async chat(apiId: string, request: ChatRequest): Promise<ChatResponse> {
    const startedAt = Date.now();
    const messages: { role: string; content: string }[] = [];
    if (request.system) messages.push({ role: 'system', content: request.system });
    messages.push({ role: 'user', content: request.user });

    const response = await httpJson<OllamaChatResponse>({
      url: `${baseUrl()}/api/chat`,
      body: {
        model: apiId,
        messages,
        stream: false,
        options: { num_predict: request.maxTokens },
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
      },
      // Un modèle local sur CPU peut être très lent : marge large.
      timeoutMs: 600_000,
    });

    const toolCalls: ToolCall[] = (response.message?.tool_calls ?? []).map((call) => ({
      name: call.function?.name ?? '',
      arguments: call.function?.arguments ?? {},
    }));

    return {
      text: (response.message?.content ?? '').trim(),
      toolCalls,
      usage: {
        inputTokens: response.prompt_eval_count ?? 0,
        outputTokens: response.eval_count ?? 0,
      },
      refused: false,
      stopReason: response.done_reason ?? null,
      latencyMs: Date.now() - startedAt,
    };
  },
};
