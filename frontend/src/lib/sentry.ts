import * as Sentry from '@sentry/react'
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'
import type { Metric } from 'web-vitals'
import { appChannel } from './envChannel'

let initialized = false

function reportWebVital(metric: Metric) {
  Sentry.addBreadcrumb({
    category: 'web-vital',
    message: metric.name,
    level: 'info',
    data: {
      id: metric.id,
      value: metric.value,
      rating: metric.rating,
    },
  })
}

/**
 * Init Sentry when `VITE_SENTRY_DSN` is set. Safe to call once at app boot.
 */
export function initSentry() {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim()
  if (!dsn || initialized) return
  initialized = true

  Sentry.init({
    dsn,
    environment: (import.meta.env.VITE_APP_CHANNEL as string) || 'development',
    sendDefaultPii: false,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
    tracesSampleRate: appChannel === 'production' ? 0.12 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: appChannel === 'production' ? 0.05 : 0.2,
  })

  onLCP(reportWebVital)
  onINP(reportWebVital)
  onCLS(reportWebVital)
  onFCP(reportWebVital)
  onTTFB(reportWebVital)
}

export { Sentry }
