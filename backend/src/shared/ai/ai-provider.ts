import type { AIProvider, AIProviderConfig } from './types';
import { AnthropicProvider } from './anthropic-provider';
import { OpenAIProvider } from './openai-provider';

export function createAnthropicProvider(config: AIProviderConfig): AIProvider {
  return new AnthropicProvider(config);
}

export function createOpenAIProvider(config: AIProviderConfig): AIProvider {
  return new OpenAIProvider(config);
}

export function createProviders(): {
  primary: AIProvider | null;
  fallback: AIProvider | null;
} {
  const anthropicKey = process.env['ANTHROPIC_API_KEY'];
  const openaiKey = process.env['OPENAI_API_KEY'];

  const primary = anthropicKey
    ? createAnthropicProvider({
        apiKey: anthropicKey,
        model: process.env['ANTHROPIC_MODEL'] ?? 'claude-sonnet-4-6',
        timeoutMs: 5000,
      })
    : null;

  const fallback = openaiKey
    ? createOpenAIProvider({
        apiKey: openaiKey,
        model: process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini',
        timeoutMs: 5000,
      })
    : null;

  return { primary, fallback };
}
