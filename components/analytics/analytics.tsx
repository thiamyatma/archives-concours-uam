"use client";

import { Suspense, useSyncExternalStore } from "react";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { RouteTracker } from "@/components/analytics/route-tracker";
import { CookieConsentBanner } from "@/components/analytics/cookie-consent-banner";
import { isAnalyticsConfigured } from "@/lib/analytics/gtag";
import {
  readConsent,
  subscribeConsent,
  writeConsent,
  type ConsentState,
} from "@/lib/analytics/consent";

/**
 * Snapshot serveur : le consentement vit dans le localStorage, illisible
 * côté serveur. On renvoie un sentinel « pending » (plutôt que `null`) pour
 * ne rien rendre au SSR — sinon la bannière serait rendue côté serveur puis
 * retirée à l'hydratation pour un visiteur ayant déjà accepté (flash).
 */
const SERVER_SNAPSHOT = "pending" as const;

/**
 * Lit le consentement comme un store externe (localStorage). `useSyncExternalStore`
 * gère proprement le SSR (voir SERVER_SNAPSHOT) et évite tout `setState` dans
 * un effet.
 */
function useConsent(): ConsentState | typeof SERVER_SNAPSHOT {
  return useSyncExternalStore(subscribeConsent, readConsent, () => SERVER_SNAPSHOT);
}

/**
 * Orchestrateur analytics, monté une fois dans le layout racine. Île client
 * isolée : n'affecte pas la génération statique des pages.
 *
 * - GA (gtag) n'est chargé QUE si : production + ID configuré
 *   (`isAnalyticsConfigured`) ET consentement accordé. En dev, ou tant que
 *   l'utilisateur n'a pas accepté, aucun script tiers n'est injecté.
 * - La bannière ne s'affiche que si un choix est encore attendu, et
 *   seulement quand l'analytics est réellement configuré (inutile de
 *   demander un consentement en dev où rien ne sera chargé).
 */
export function Analytics() {
  const consent = useConsent();

  if (!isAnalyticsConfigured()) return null;

  return (
    <>
      {consent === "granted" && (
        <>
          <GoogleAnalytics />
          <Suspense fallback={null}>
            <RouteTracker />
          </Suspense>
        </>
      )}
      {consent === null && <CookieConsentBanner onChoice={writeConsent} />}
    </>
  );
}
