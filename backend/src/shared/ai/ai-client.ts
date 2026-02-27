import type { AIProvider, AIRequestOptions, AICompletionResult } from './types';
import { AIServiceError, AIProviderError } from './types';

export interface AIClientLogger {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

export interface AIClientOptions {
  primary: AIProvider | null;
  fallback: AIProvider | null;
  totalTimeoutMs?: number;
  logger?: AIClientLogger;
}

const TOTAL_TIMEOUT_MS = 10_000;

export class AIClient {
  private primary: AIProvider | null;
  private fallback: AIProvider | null;
  private totalTimeoutMs: number;
  private logger: AIClientLogger | null;

  constructor(options: AIClientOptions) {
    this.primary = options.primary;
    this.fallback = options.fallback;
    this.totalTimeoutMs = options.totalTimeoutMs ?? TOTAL_TIMEOUT_MS;
    this.logger = options.logger ?? null;
  }

  async generate(
    prompt: string,
    options: AIRequestOptions = {},
  ): Promise<AICompletionResult> {
    const startTime = Date.now();

    if (!this.primary && !this.fallback) {
      throw new AIServiceError(
        'AI service temporarily unavailable — please try again in a few minutes',
        'AI_SERVICE_UNAVAILABLE',
      );
    }

    // Try primary provider
    if (this.primary) {
      try {
        const result = await this.executeWithTimeout(
          this.primary,
          prompt,
          options,
          startTime,
        );

        this.logger?.info(
          {
            provider: result.provider,
            responseTimeMs: result.responseTimeMs,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
          },
          'AI request completed via primary provider',
        );

        return result;
      } catch (error: unknown) {
        const elapsed = Date.now() - startTime;
        this.logger?.warn(
          {
            provider: this.primary.name,
            error: error instanceof Error ? error.message : 'Unknown',
            code: error instanceof AIProviderError ? error.code : 'UNKNOWN',
            elapsedMs: elapsed,
          },
          'Primary AI provider failed, attempting fallback',
        );
      }
    }

    // Try fallback provider
    if (this.fallback) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= this.totalTimeoutMs) {
        throw new AIServiceError(
          'AI service temporarily unavailable — please try again in a few minutes',
          'AI_SERVICE_UNAVAILABLE',
        );
      }

      try {
        const result = await this.executeWithTimeout(
          this.fallback,
          prompt,
          options,
          startTime,
        );

        this.logger?.info(
          {
            provider: result.provider,
            responseTimeMs: result.responseTimeMs,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            failover: true,
          },
          'AI request completed via fallback provider',
        );

        return result;
      } catch (error: unknown) {
        this.logger?.error(
          {
            provider: this.fallback.name,
            error: error instanceof Error ? error.message : 'Unknown',
            code: error instanceof AIProviderError ? error.code : 'UNKNOWN',
          },
          'Fallback AI provider also failed',
        );
      }
    }

    throw new AIServiceError(
      'AI service temporarily unavailable — please try again in a few minutes',
      'AI_SERVICE_UNAVAILABLE',
    );
  }

  private async executeWithTimeout(
    provider: AIProvider,
    prompt: string,
    options: AIRequestOptions,
    startTime: number,
  ): Promise<AICompletionResult> {
    const elapsed = Date.now() - startTime;
    const remainingMs = this.totalTimeoutMs - elapsed;

    if (remainingMs <= 0) {
      throw new AIProviderError(
        'Total timeout exceeded',
        'TIMEOUT',
        provider.name,
      );
    }

    return new Promise<AICompletionResult>((resolve, reject) => {
      const totalTimer = setTimeout(() => {
        reject(
          new AIProviderError(
            'Total timeout exceeded',
            'TIMEOUT',
            provider.name,
          ),
        );
      }, remainingMs);

      provider
        .generateCompletion(prompt, options)
        .then((result) => {
          clearTimeout(totalTimer);
          resolve(result);
        })
        .catch((error: unknown) => {
          clearTimeout(totalTimer);
          reject(error);
        });
    });
  }
}
