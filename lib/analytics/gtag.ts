import type { AnalyticsEventName, AnalyticsEventParams } from "@/lib/analytics/events";

/** ID de mesure GA4 (`G-XXXXXXX`). Absent = analytics désactivé (dev, CI, ou non configuré). */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/** GA n'est jamais chargé hors production, ni sans ID de mesure configuré. */
export function isAnalyticsConfigured(): boolean {
  return process.env.NODE_ENV === "production" && Boolean(GA_MEASUREMENT_ID);
}

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: unknown[];
  }
}

/** Vrai uniquement si le script gtag.js a été injecté (donc consentement accordé). */
function hasGtag(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

/** Envoie un `page_view` GA4 pour l'URL donnée. No-op si gtag n'est pas chargé. */
export function pageview(url: string): void {
  if (!hasGtag() || !GA_MEASUREMENT_ID) return;
  window.gtag!("event", "page_view", {
    page_path: url,
    send_to: GA_MEASUREMENT_ID,
  });
}

/** Envoie un événement GA4. No-op sûr si gtag n'est pas chargé (dev / consentement refusé). */
export function gtagEvent(name: AnalyticsEventName, params?: AnalyticsEventParams): void {
  if (!hasGtag()) return;
  window.gtag!("event", name, params ?? {});
}
