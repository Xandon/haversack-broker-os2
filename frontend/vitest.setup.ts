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

afterEach(() => {
  cleanup();
});
