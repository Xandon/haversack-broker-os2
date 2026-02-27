import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AIProviderConfig, AIRequestOptions, AICompletionResult } from './types';
import { AIProviderError } from './types';

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  private client: Anthropic;
  private model: string;
  private timeoutMs: number;

  constructor(config: AIProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
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
      const response = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: options.maxTokens ?? 2048,
          messages: [{ role: 'user', content: prompt }],
          ...(options.systemPrompt ? { system: options.systemPrompt } : {}),
        },
        { signal: controller.signal },
      );

      const responseTimeMs = Date.now() - startTime;
      const textBlock = response.content.find((block) => block.type === 'text');
      const content = textBlock && 'text' in textBlock ? textBlock.text : '';

      return {
        content,
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
        provider: this.name,
        responseTimeMs,
      };
    } catch (error: unknown) {
      const responseTimeMs = Date.now() - startTime;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AIProviderError(
          `Anthropic request timed out after ${this.timeoutMs}ms`,
          'TIMEOUT',
          this.name,
        );
      }
      const statusCode = (error as Record<string, unknown>)['status'] as number | undefined;
      if (statusCode === 429) {
        throw new AIProviderError(
          'Anthropic rate limited',
          'RATE_LIMITED',
          this.name,
        );
      }
      if (statusCode && statusCode >= 500) {
        throw new AIProviderError(
          `Anthropic server error: ${statusCode}`,
          'SERVER_ERROR',
          this.name,
        );
      }
      throw new AIProviderError(
        `Anthropic error: ${error instanceof Error ? error.message : 'Unknown'} (${responseTimeMs}ms)`,
        'PROVIDER_ERROR',
        this.name,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
