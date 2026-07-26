import type { ChatRequest, ChatResponse, PingResult, ProviderAdapter, ToolCall } from '../types';
import { httpJson, requireEnv } from './http';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string; functionCall?: { name?: string; args?: unknown } }[] };
    finishReason?: string;
  }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  promptFeedback?: { blockReason?: string };
}

function envKeyName(): string {
  return process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : 'GOOGLE_API_KEY';
}

export const googleAdapter: ProviderAdapter = {
  id: 'google',
  envKey: 'GEMINI_API_KEY',

  async ping(apiId: string): Promise<PingResult> {
    try {
      const key = requireEnv(envKeyName());
      const model = await httpJson<{ name?: string; displayName?: string }>({
        url: `${BASE}/models/${encodeURIComponent(apiId)}?key=${encodeURIComponent(key)}`,
        method: 'GET',
        timeoutMs: 20_000,
      });
      return { ok: true, detail: model.displayName ?? model.name ?? apiId };
    } catch (error) {
      return { ok: false, detail: error instanceof Error ? error.message : String(error) };
    }
  },

  async chat(apiId: string, request: ChatRequest): Promise<ChatResponse> {
    const key = requireEnv(envKeyName());
    const startedAt = Date.now();

    const response = await httpJson<GeminiResponse>({
      url: `${BASE}/models/${encodeURIComponent(apiId)}:generateContent?key=${encodeURIComponent(key)}`,
      body: {
        contents: [{ role: 'user', parts: [{ text: request.user }] }],
        ...(request.system ? { systemInstruction: { parts: [{ text: request.system }] } } : {}),
        generationConfig: { maxOutputTokens: request.maxTokens },
        ...(request.tools?.length
          ? {
              tools: [
                {
                  functionDeclarations: request.tools.map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                  })),
                },
              ],
            }
          : {}),
      },
    });

    const candidate = response.candidates?.[0];
    const texts: string[] = [];
    const toolCalls: ToolCall[] = [];
    for (const part of candidate?.content?.parts ?? []) {
      if (typeof part.text === 'string') texts.push(part.text);
      if (part.functionCall?.name) {
        toolCalls.push({
          name: part.functionCall.name,
          arguments: (part.functionCall.args ?? {}) as Record<string, unknown>,
        });
      }
    }

    const finish = candidate?.finishReason ?? null;
    return {
      text: texts.join('\n').trim(),
      toolCalls,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      },
      refused: finish === 'SAFETY' || Boolean(response.promptFeedback?.blockReason),
      stopReason: finish,
      latencyMs: Date.now() - startedAt,
    };
  },
};
