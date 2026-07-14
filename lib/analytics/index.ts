/** API publique de l'analytics. Voir docs/google-analytics.md. */
export {
  ANALYTICS_EVENTS,
  type AnalyticsEventName,
  type AnalyticsEventParams,
} from "@/lib/analytics/events";
export {
  GA_MEASUREMENT_ID,
  isAnalyticsConfigured,
  pageview,
  gtagEvent,
} from "@/lib/analytics/gtag";
export {
  type Consent,
  type ConsentState,
  CONSENT_STORAGE_KEY,
  readConsent,
  writeConsent,
} from "@/lib/analytics/consent";
export * from "@/lib/analytics/track";
