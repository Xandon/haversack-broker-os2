/**
 * AI provider abstraction layer.
 * Anthropic Claude API (primary) with OpenAI fallback.
 * Implements FR-035 (AI content generation), FR-036 (graceful degradation),
 * NFR-005 (3s p95, 5s timeout per provider, 10s hard timeout).
 */
import { logger } from '../../shared/utils/logger.js';

/** Per-provider timeout in milliseconds (NFR-005) */
export const AI_TIMEOUT_MS = 5000;

/** Hard cutoff for the entire AI call including fallback (NFR-005) */
export const AI_HARD_TIMEOUT_MS = 10000;

/** Request options for AI provider calls */
export interface AiProviderRequest {
  prompt: string;
  systemPrompt: string;
  model?: string;
  maxTokens?: number;
  timeoutMs?: number;
}

/** Standardized response from any AI provider */
export interface AiProviderResponse {
  success: boolean;
  provider?: 'anthropic' | 'openai';
  content?: string;
  error?: string;
}

/**
 * Call the Anthropic Claude API.
 */
async function callAnthropic(
  request: AiProviderRequest,
  timeoutMs: number,
): Promise<AiProviderResponse> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    return { success: false, error: 'Anthropic API key not configured' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model ?? 'claude-sonnet-4-20250514',
        max_tokens: request.maxTokens ?? 2048,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.prompt }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      return { success: false, error: `Anthropic API ${response.status}: ${errorBody}` };
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    const textContent = data.content.find((c) => c.type === 'text');

    return {
      success: true,
      provider: 'anthropic',
      content: textContent?.text ?? '',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Anthropic: ${message}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call the OpenAI API (fallback provider).
 */
async function callOpenAI(
  request: AiProviderRequest,
  timeoutMs: number,
): Promise<AiProviderResponse> {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    return { success: false, error: 'OpenAI API key not configured' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: request.maxTokens ?? 2048,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.prompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      return { success: false, error: `OpenAI API ${response.status}: ${errorBody}` };
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    return {
      success: true,
      provider: 'openai',
      content: data.choices[0]?.message?.content ?? '',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `OpenAI: ${message}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call AI provider with automatic fallback.
 * Tries Anthropic first; on failure, falls back to OpenAI.
 * Both providers share a hard timeout (NFR-005).
 * Returns no stale/cached content on failure (FR-036).
 */
export async function callAiProvider(
  request: AiProviderRequest,
): Promise<AiProviderResponse> {
  const perProviderTimeout = request.timeoutMs ?? AI_TIMEOUT_MS;

  // Try primary provider (Anthropic)
  logger.info(
    { operation: 'ai-call', provider: 'anthropic' },
    'Calling primary AI provider (Anthropic)',
  );

  const primaryResult = await callAnthropic(request, perProviderTimeout);
  if (primaryResult.success) {
    logger.info(
      { operation: 'ai-call', provider: 'anthropic', success: true },
      'Primary AI provider responded successfully',
    );
    return primaryResult;
  }

  logger.warn(
    { operation: 'ai-call', provider: 'anthropic', error: primaryResult.error },
    'Primary AI provider failed, falling back to OpenAI',
  );

  // Try fallback provider (OpenAI)
  const fallbackResult = await callOpenAI(request, perProviderTimeout);
  if (fallbackResult.success) {
    logger.info(
      { operation: 'ai-call', provider: 'openai', success: true },
      'Fallback AI provider responded successfully',
    );
    return fallbackResult;
  }

  logger.error(
    {
      operation: 'ai-call',
      primaryError: primaryResult.error,
      fallbackError: fallbackResult.error,
    },
    'Both AI providers failed',
  );

  // Both failed — return error with no stale content (FR-036)
  return {
    success: false,
    error: 'AI service temporarily unavailable — please try again in a few minutes',
  };
}
