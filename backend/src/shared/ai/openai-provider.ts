import OpenAI from 'openai';
import type { AIProvider, AIProviderConfig, AIRequestOptions, AICompletionResult } from './types';
import { AIProviderError } from './types';

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private model: string;
  private timeoutMs: number;

  constructor(config: AIProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model;
    this.timeoutMs = config.timeoutMs;
  }

  async generateCompletion(
    prompt: string,
    options: AIRequestOptions,
  ): Promise<AICompletionResult> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await this.client.chat.completions.create(
        {
          model: this.model,
          max_tokens: options.maxTokens ?? 2048,
          messages,
        },
        { signal: controller.signal },
      );

      const responseTimeMs = Date.now() - startTime;
      const content = response.choices[0]?.message?.content ?? '';

      return {
        content,
        inputTokens: response.usage?.prompt_tokens ?? null,
        outputTokens: response.usage?.completion_tokens ?? null,
        provider: this.name,
        responseTimeMs,
      };
    } catch (error: unknown) {
      const responseTimeMs = Date.now() - startTime;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AIProviderError(
          `OpenAI request timed out after ${this.timeoutMs}ms`,
          'TIMEOUT',
          this.name,
        );
      }
      const statusCode = (error as Record<string, unknown>)['status'] as number | undefined;
      if (statusCode === 429) {
        throw new AIProviderError(
          'OpenAI rate limited',
          'RATE_LIMITED',
          this.name,
        );
      }
      if (statusCode && statusCode >= 500) {
        throw new AIProviderError(
          `OpenAI server error: ${statusCode}`,
          'SERVER_ERROR',
          this.name,
        );
      }
      throw new AIProviderError(
        `OpenAI error: ${error instanceof Error ? error.message : 'Unknown'} (${responseTimeMs}ms)`,
        'PROVIDER_ERROR',
        this.name,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
