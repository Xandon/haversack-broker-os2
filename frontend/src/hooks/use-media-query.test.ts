import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './use-media-query';

describe('FR-031: useMediaQuery hook', () => {
  let listeners: Map<string, (event: MediaQueryListEvent) => void>;
  let matchesMap: Map<string, boolean>;

  beforeEach(() => {
    listeners = new Map();
    matchesMap = new Map();

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn((query: string) => ({
        matches: matchesMap.get(query) ?? false,
        media: query,
        addEventListener: vi.fn((_event: string, handler: (event: MediaQueryListEvent) => void) => {
          listeners.set(query, handler);
        }),
        removeEventListener: vi.fn((_event: string) => {
          listeners.delete(query);
        }),
      })),
    });
  });

  afterEach(() => {
    listeners.clear();
    matchesMap.clear();
  });

  test('US4-AC3: returns false by default (SSR safety)', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);
  });

  test('US4-AC3: returns true when media query matches', () => {
    matchesMap.set('(min-width: 768px)', true);
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  test('US4-AC3: updates when media query changes', () => {
    matchesMap.set('(min-width: 768px)', false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);

    act(() => {
      const handler = listeners.get('(min-width: 768px)');
      handler?.({ matches: true } as MediaQueryListEvent);
    });
    expect(result.current).toBe(true);
  });

  test('US4-AC3: cleans up listener on unmount', () => {
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    unmount();
    expect(listeners.has('(min-width: 768px)')).toBe(false);
  });
});
