import { ANALYTICS_EVENTS, type AnalyticsEventParams } from "@/lib/analytics/events";
import { gtagEvent } from "@/lib/analytics/gtag";

/**
 * Point d'entrée générique pour envoyer un événement. Toujours sûr à
 * appeler : no-op si GA n'est pas chargé (dev, consentement refusé, ID
 * absent). Préférer les wrappers typés ci-dessous quand ils existent.
 */
export function trackEvent(
  name: (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS],
  params?: AnalyticsEventParams
): void {
  gtagEvent(name, params);
}

// Wrappers typés — un par événement du catalogue. Câblés ou dormants selon
// que la fonctionnalité existe (voir docs/google-analytics.md).

export const trackViewSubject = (params?: AnalyticsEventParams) =>
  trackEvent(ANALYTICS_EVENTS.VIEW_SUBJECT, params);

export const trackOpenSubject = (params?: AnalyticsEventParams) =>
  trackEvent(ANALYTICS_EVENTS.OPEN_SUBJECT, params);

export const trackSearchSubject = (params?: AnalyticsEventParams) =>
  trackEvent(ANALYTICS_EVENTS.SEARCH_SUBJECT, params);

export const trackFilterDepartment = (params?: AnalyticsEventParams) =>
  trackEvent(ANALYTICS_EVENTS.FILTER_DEPARTMENT, params);

export const trackFilterYear = (params?: AnalyticsEventParams) =>
  trackEvent(ANALYTICS_EVENTS.FILTER_YEAR, params);

export const trackFilterSubject = (params?: AnalyticsEventParams) =>
  trackEvent(ANALYTICS_EVENTS.FILTER_SUBJECT, params);

export const trackLogin = (params?: AnalyticsEventParams) =>
  trackEvent(ANALYTICS_EVENTS.LOGIN, params);

export const trackSignup = (params?: AnalyticsEventParams) =>
  trackEvent(ANALYTICS_EVENTS.SIGNUP, params);

export const trackContact = (params?: AnalyticsEventParams) =>
  trackEvent(ANALYTICS_EVENTS.CONTACT, params);

export const trackReportDocument = (params?: AnalyticsEventParams) =>
  trackEvent(ANALYTICS_EVENTS.REPORT_DOCUMENT, params);

export const trackShareSubject = (params?: AnalyticsEventParams) =>
  trackEvent(ANALYTICS_EVENTS.SHARE_SUBJECT, params);

export const trackDownloadSubject = (params?: AnalyticsEventParams) =>
  trackEvent(ANALYTICS_EVENTS.DOWNLOAD_SUBJECT, params);
