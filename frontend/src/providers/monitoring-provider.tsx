'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

let sentryInitialized = false;
let posthogInitialized = false;

function initSentry(): void {
  if (sentryInitialized) return;
  const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN'];
  if (!dsn) return;

  // Dynamic import to avoid bundling when not configured
  void import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      environment: process.env['NODE_ENV'] ?? 'development',
    });
    sentryInitialized = true;
  });
}

function initPostHog(): void {
  if (posthogInitialized) return;
  const key = process.env['NEXT_PUBLIC_POSTHOG_KEY'];
  if (!key) return;

  void import('posthog-js').then((posthogModule) => {
    const posthog = posthogModule.default;
    posthog.init(key, {
      api_host: process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://us.i.posthog.com',
      capture_pageview: false, // We handle page views manually
      persistence: 'localStorage',
    });
    posthogInitialized = true;
  });
}

function PageViewTracker(): null {
  const pathname = usePathname();

  useEffect(() => {
    if (!posthogInitialized) return;

    void import('posthog-js').then((posthogModule) => {
      posthogModule.default.capture('$pageview', { $current_url: pathname });
    });
  }, [pathname]);

  return null;
}

export function MonitoringProvider({ children }: { children: ReactNode }): React.ReactElement {
  useEffect(() => {
    initSentry();
    initPostHog();
  }, []);

  return (
    <>
      <PageViewTracker />
      {children}
    </>
  );
}
