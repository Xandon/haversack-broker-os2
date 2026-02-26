/**
 * Tests for AI provider abstraction layer.
 * Verifies FR-035 (AI-generated content), FR-036 (graceful degradation),
 * and NFR-005 (3s p95, 10s hard timeout).
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';

import {
  callAiProvider,
  AI_TIMEOUT_MS,
  AI_HARD_TIMEOUT_MS,
} from './provider-abstraction.js';

// -------------------------------------------------------------------
// Test constants
// -------------------------------------------------------------------
const TEST_PROMPT = 'Analyze order history for Pacific Bistro';
const TEST_SYSTEM_PROMPT = 'You are a specialty food sales assistant.';

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('AI Provider Abstraction (T109)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('Timeout configuration', () => {
    test('NFR-005: default timeout is 5 seconds per provider', () => {
      expect(AI_TIMEOUT_MS).toBe(5000);
    });

    test('NFR-005: hard timeout is 10 seconds total', () => {
      expect(AI_HARD_TIMEOUT_MS).toBe(10000);
    });
  });

  describe('Primary provider (Anthropic)', () => {
    test('FR-035: returns AI-generated content from primary provider', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: '{"items": []}' }],
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await callAiProvider({
        prompt: TEST_PROMPT,
        systemPrompt: TEST_SYSTEM_PROMPT,
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('anthropic');
      expect(result.content).toBeDefined();
    });

    test('FR-036: falls back to secondary provider on primary failure', async () => {
      const mockFetch = vi
        .fn()
        // Primary fails
        .mockRejectedValueOnce(new Error('Anthropic API error'))
        // Fallback succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: '{"items": []}' } }],
          }),
        });
      vi.stubGlobal('fetch', mockFetch);

      const result = await callAiProvider({
        prompt: TEST_PROMPT,
        systemPrompt: TEST_SYSTEM_PROMPT,
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('openai');
    });
  });

  describe('Fallback and degradation', () => {
    test('FR-036: returns error when both providers fail', async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Anthropic down'))
        .mockRejectedValueOnce(new Error('OpenAI down'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await callAiProvider({
        prompt: TEST_PROMPT,
        systemPrompt: TEST_SYSTEM_PROMPT,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('FR-036: returns error with no stale content when unavailable', async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await callAiProvider({
        prompt: TEST_PROMPT,
        systemPrompt: TEST_SYSTEM_PROMPT,
      });

      expect(result.success).toBe(false);
      expect(result.content).toBeUndefined();
    });

    test('NFR-005: respects per-provider timeout', async () => {
      const mockFetch = vi.fn().mockImplementation(
        () =>
          new Promise((_resolve) => {
            // Never resolves — simulates timeout
          }),
      );
      vi.stubGlobal('fetch', mockFetch);

      const start = Date.now();
      const result = await callAiProvider({
        prompt: TEST_PROMPT,
        systemPrompt: TEST_SYSTEM_PROMPT,
        timeoutMs: 100, // Short timeout for test
      });
      const elapsed = Date.now() - start;

      expect(result.success).toBe(false);
      // Should complete reasonably quickly with 100ms timeout per provider
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('API key validation', () => {
    test('FR-036: handles missing API keys gracefully', async () => {
      // Save and clear env
      const originalAnthropicKey = process.env['ANTHROPIC_API_KEY'];
      const originalOpenaiKey = process.env['OPENAI_API_KEY'];
      delete process.env['ANTHROPIC_API_KEY'];
      delete process.env['OPENAI_API_KEY'];

      const result = await callAiProvider({
        prompt: TEST_PROMPT,
        systemPrompt: TEST_SYSTEM_PROMPT,
      });

      expect(result.success).toBe(false);

      // Restore env
      if (originalAnthropicKey) process.env['ANTHROPIC_API_KEY'] = originalAnthropicKey;
      if (originalOpenaiKey) process.env['OPENAI_API_KEY'] = originalOpenaiKey;
    });
  });
});
