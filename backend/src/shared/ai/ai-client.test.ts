import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIClient } from './ai-client';
import type { AIProvider, AICompletionResult, AIRequestOptions } from './types';
import { AIProviderError, AIServiceError } from './types';

function createMockProvider(
  name: string,
  result?: Partial<AICompletionResult>,
  error?: Error,
  delay = 0,
): AIProvider {
  return {
    name,
    generateCompletion: vi.fn(
      async (_prompt: string, _options: AIRequestOptions): Promise<AICompletionResult> => {
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        if (error) throw error;
        return {
          content: result?.content ?? '{"test": true}',
          inputTokens: result?.inputTokens ?? 100,
          outputTokens: result?.outputTokens ?? 50,
          provider: name,
          responseTimeMs: result?.responseTimeMs ?? 200,
        };
      },
    ),
  };
}

function createMockLogger(): {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
} {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe('FR-AI-001: AIClient with failover', () => {
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    logger = createMockLogger();
  });

  it('FR-AI-001: routes request to primary provider on success', async () => {
    const primary = createMockProvider('anthropic', { content: '{"result": "ok"}' });
    const fallback = createMockProvider('openai');
    const client = new AIClient({ primary, fallback, logger });

    const result = await client.generate('test prompt');

    expect(result.provider).toBe('anthropic');
    expect(result.content).toBe('{"result": "ok"}');
    expect(primary.generateCompletion).toHaveBeenCalledOnce();
    expect(fallback.generateCompletion).not.toHaveBeenCalled();
  });

  it('FR-AI-001: fails over to fallback when primary throws', async () => {
    const primary = createMockProvider(
      'anthropic',
      undefined,
      new AIProviderError('Server error', 'SERVER_ERROR', 'anthropic'),
    );
    const fallback = createMockProvider('openai', { content: '{"fallback": true}' });
    const client = new AIClient({ primary, fallback, logger });

    const result = await client.generate('test prompt');

    expect(result.provider).toBe('openai');
    expect(result.content).toBe('{"fallback": true}');
    expect(primary.generateCompletion).toHaveBeenCalledOnce();
    expect(fallback.generateCompletion).toHaveBeenCalledOnce();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('FR-AI-001: fails over to fallback when primary times out', async () => {
    const primary = createMockProvider(
      'anthropic',
      undefined,
      new AIProviderError('Timeout', 'TIMEOUT', 'anthropic'),
    );
    const fallback = createMockProvider('openai');
    const client = new AIClient({ primary, fallback, logger });

    const result = await client.generate('test prompt');

    expect(result.provider).toBe('openai');
  });

  it('FR-AI-001: fails over when primary is rate-limited by provider', async () => {
    const primary = createMockProvider(
      'anthropic',
      undefined,
      new AIProviderError('Rate limited', 'RATE_LIMITED', 'anthropic'),
    );
    const fallback = createMockProvider('openai');
    const client = new AIClient({ primary, fallback, logger });

    const result = await client.generate('test prompt');

    expect(result.provider).toBe('openai');
  });

  it('FR-AI-007: throws AIServiceError when both providers fail', async () => {
    const primary = createMockProvider(
      'anthropic',
      undefined,
      new AIProviderError('Server error', 'SERVER_ERROR', 'anthropic'),
    );
    const fallback = createMockProvider(
      'openai',
      undefined,
      new AIProviderError('Server error', 'SERVER_ERROR', 'openai'),
    );
    const client = new AIClient({ primary, fallback, logger });

    await expect(client.generate('test prompt')).rejects.toThrow(AIServiceError);
    await expect(client.generate('test prompt')).rejects.toThrow(
      'AI service temporarily unavailable',
    );
  });

  it('FR-AI-007: throws AIServiceError when no providers configured', async () => {
    const client = new AIClient({ primary: null, fallback: null, logger });

    await expect(client.generate('test prompt')).rejects.toThrow(AIServiceError);
    await expect(client.generate('test prompt')).rejects.toThrow(
      'AI service temporarily unavailable',
    );
  });

  it('FR-AI-002: enforces total timeout across failover', async () => {
    const primary = createMockProvider(
      'anthropic',
      undefined,
      new AIProviderError('Timeout', 'TIMEOUT', 'anthropic'),
      0,
    );
    // Fallback takes too long
    const fallback = createMockProvider('openai', undefined, undefined, 200);
    const client = new AIClient({
      primary,
      fallback,
      totalTimeoutMs: 100,
      logger,
    });

    await expect(client.generate('test prompt')).rejects.toThrow(AIServiceError);
  });

  it('FR-AI-001: works with only primary provider (no fallback)', async () => {
    const primary = createMockProvider('anthropic');
    const client = new AIClient({ primary, fallback: null, logger });

    const result = await client.generate('test prompt');

    expect(result.provider).toBe('anthropic');
  });

  it('FR-AI-001: works with only fallback provider (no primary)', async () => {
    const fallback = createMockProvider('openai');
    const client = new AIClient({ primary: null, fallback, logger });

    const result = await client.generate('test prompt');

    expect(result.provider).toBe('openai');
  });

  it('FR-AI-009: logs successful request with provider metadata', async () => {
    const primary = createMockProvider('anthropic', {
      inputTokens: 150,
      outputTokens: 75,
    });
    const client = new AIClient({ primary, fallback: null, logger });

    await client.generate('test prompt');

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'anthropic',
        inputTokens: 150,
        outputTokens: 75,
      }),
      expect.stringContaining('primary provider'),
    );
  });

  it('FR-AI-009: logs failover event with error details', async () => {
    const primary = createMockProvider(
      'anthropic',
      undefined,
      new AIProviderError('Server error', 'SERVER_ERROR', 'anthropic'),
    );
    const fallback = createMockProvider('openai');
    const client = new AIClient({ primary, fallback, logger });

    await client.generate('test prompt');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'anthropic',
        code: 'SERVER_ERROR',
      }),
      expect.stringContaining('Primary AI provider failed'),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        failover: true,
      }),
      expect.stringContaining('fallback provider'),
    );
  });

  it('FR-AI-009: logs when both providers fail', async () => {
    const primary = createMockProvider(
      'anthropic',
      undefined,
      new AIProviderError('Error', 'SERVER_ERROR', 'anthropic'),
    );
    const fallback = createMockProvider(
      'openai',
      undefined,
      new AIProviderError('Error', 'SERVER_ERROR', 'openai'),
    );
    const client = new AIClient({ primary, fallback, logger });

    try {
      await client.generate('test prompt');
    } catch {
      // Expected
    }

    expect(logger.warn).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('FR-AI-001: passes prompt and options to provider', async () => {
    const primary = createMockProvider('anthropic');
    const client = new AIClient({ primary, fallback: null, logger });

    await client.generate('my prompt', {
      maxTokens: 1024,
      systemPrompt: 'system instruction',
    });

    expect(primary.generateCompletion).toHaveBeenCalledWith(
      'my prompt',
      { maxTokens: 1024, systemPrompt: 'system instruction' },
    );
  });

  it('FR-AI-002: handles primary taking close to timeout then fallback succeeding', async () => {
    // Primary fails quickly, leaving time for fallback
    const primary = createMockProvider(
      'anthropic',
      undefined,
      new AIProviderError('Timeout', 'TIMEOUT', 'anthropic'),
      10,
    );
    const fallback = createMockProvider('openai', undefined, undefined, 10);
    const client = new AIClient({
      primary,
      fallback,
      totalTimeoutMs: 5000,
      logger,
    });

    const result = await client.generate('test prompt');
    expect(result.provider).toBe('openai');
  });
});
