import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Polyfill ResizeObserver for jsdom (required by cmdk)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe(): void { /* noop */ }
    unobserve(): void { /* noop */ }
    disconnect(): void { /* noop */ }
  };
}

// Polyfill matchMedia for jsdom (required by useMediaQuery)
if (typeof window.matchMedia === 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: (): void => { /* noop */ },
      removeListener: (): void => { /* noop */ },
      addEventListener: (): void => { /* noop */ },
      removeEventListener: (): void => { /* noop */ },
      dispatchEvent: (): boolean => false,
    }),
  });
}

afterEach(() => {
  cleanup();
});
