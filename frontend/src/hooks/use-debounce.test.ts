import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './use-debounce';

describe('FR-031: useDebounce hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('US4-AC1: returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  test('US4-AC1: debounces value updates by specified delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'hello', delay: 300 },
    });

    rerender({ value: 'world', delay: 300 });
    expect(result.current).toBe('hello');

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('hello');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('world');
  });

  test('US4-AC1: resets timer when value changes before delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'a', delay: 300 },
    });

    rerender({ value: 'b', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: 'c', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('c');
  });

  test('US4-AC1: cleans up timeout on unmount', () => {
    const { unmount } = renderHook(() => useDebounce('test', 300));
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
