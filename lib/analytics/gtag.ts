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

// gtag.js est chargé en `afterInteractive` (voir google-analytics.tsx) : un
// appel juste après le montage (ex. le tout premier page_view envoyé par
// route-tracker.tsx) peut arriver avant que le script soit prêt. Plutôt que
// de le perdre silencieusement, on le met en attente et on le rejoue dès que
// `window.gtag` existe (poll léger). Plafonné à quelques secondes : si le
// script ne charge jamais (consentement refusé après coup, échec réseau),
// on abandonne au lieu de poller indéfiniment.
const MAX_FLUSH_ATTEMPTS = 30; // ~3s à 100ms d'intervalle

let pendingCalls: (() => void)[] = [];
let flushing = false;

function flushWhenReady(): void {
  if (flushing) return;
  flushing = true;
  let attempts = 0;

  const tryFlush = () => {
    if (hasGtag()) {
      const calls = pendingCalls;
      pendingCalls = [];
      flushing = false;
      calls.forEach((call) => call());
      return;
    }
    attempts += 1;
    if (attempts >= MAX_FLUSH_ATTEMPTS) {
      pendingCalls = [];
      flushing = false;
      return;
    }
    setTimeout(tryFlush, 100);
  };

  tryFlush();
}

/** Toujours sûr à appeler (dev, consentement refusé, ID absent = no-op). */
function callGtag(...args: unknown[]): void {
  if (typeof window === "undefined") return;

  if (hasGtag()) {
    window.gtag!(...args);
    return;
  }

  // Pas encore chargé : ne mettre en attente que si GA est réellement censé
  // se charger un jour (production + ID configuré). Sinon (dev, tests,
  // consentement jamais accordé) on no-op immédiatement plutôt que de
  // lancer un poll qui n'aboutira jamais.
  if (!isAnalyticsConfigured()) return;

  pendingCalls.push(() => window.gtag!(...args));
  flushWhenReady();
}

/** Envoie un `page_view` GA4 pour l'URL donnée. Mis en attente si gtag n'est pas encore chargé. */
export function pageview(url: string): void {
  if (!GA_MEASUREMENT_ID) return;
  callGtag("event", "page_view", { page_path: url, send_to: GA_MEASUREMENT_ID });
}

/** Envoie un événement GA4. Mis en attente si gtag n'est pas encore chargé. */
export function gtagEvent(name: AnalyticsEventName, params?: AnalyticsEventParams): void {
  callGtag("event", name, params ?? {});
}
