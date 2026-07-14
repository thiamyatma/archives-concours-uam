"use client";

import { useMemo } from "react";
import { trackEvent } from "@/lib/analytics/track";
import { ANALYTICS_EVENTS, type AnalyticsEventParams } from "@/lib/analytics/events";

/**
 * Envoyer facilement un événement GA4 depuis n'importe quel Client
 * Component. Tous les envois sont sûrs : no-op si GA n'est pas chargé (dev,
 * consentement refusé, ID absent). Les références renvoyées sont stables
 * (mémoïsées) pour pouvoir figurer sans risque dans des dépendances d'effet.
 *
 * ```tsx
 * const { trackViewSubject } = useAnalytics();
 * trackViewSubject({ department: "dsti", year: 2025 });
 * ```
 */
export function useAnalytics() {
  return useMemo(
    () => ({
      /** Envoi générique — préférer un wrapper typé quand il existe. */
      trackEvent,
      trackViewSubject: (params?: AnalyticsEventParams) =>
        trackEvent(ANALYTICS_EVENTS.VIEW_SUBJECT, params),
      trackOpenSubject: (params?: AnalyticsEventParams) =>
        trackEvent(ANALYTICS_EVENTS.OPEN_SUBJECT, params),
      trackSearchSubject: (params?: AnalyticsEventParams) =>
        trackEvent(ANALYTICS_EVENTS.SEARCH_SUBJECT, params),
      trackFilterDepartment: (params?: AnalyticsEventParams) =>
        trackEvent(ANALYTICS_EVENTS.FILTER_DEPARTMENT, params),
      trackFilterYear: (params?: AnalyticsEventParams) =>
        trackEvent(ANALYTICS_EVENTS.FILTER_YEAR, params),
      trackFilterSubject: (params?: AnalyticsEventParams) =>
        trackEvent(ANALYTICS_EVENTS.FILTER_SUBJECT, params),
      trackLogin: (params?: AnalyticsEventParams) =>
        trackEvent(ANALYTICS_EVENTS.LOGIN, params),
      trackSignup: (params?: AnalyticsEventParams) =>
        trackEvent(ANALYTICS_EVENTS.SIGNUP, params),
      trackContact: (params?: AnalyticsEventParams) =>
        trackEvent(ANALYTICS_EVENTS.CONTACT, params),
      trackReportDocument: (params?: AnalyticsEventParams) =>
        trackEvent(ANALYTICS_EVENTS.REPORT_DOCUMENT, params),
      trackShareSubject: (params?: AnalyticsEventParams) =>
        trackEvent(ANALYTICS_EVENTS.SHARE_SUBJECT, params),
      trackDownloadSubject: (params?: AnalyticsEventParams) =>
        trackEvent(ANALYTICS_EVENTS.DOWNLOAD_SUBJECT, params),
    }),
    []
  );
}
