"use client";

import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/analytics/gtag";

/**
 * Injecte gtag.js + la config GA4. Rendu uniquement quand l'orchestrateur
 * (`components/analytics/analytics.tsx`) a validé : production + ID présent
 * + consentement accordé. `strategy="afterInteractive"` : chargé après
 * l'hydratation, sans peser sur le rendu initial. `send_page_view: false`
 * car les vues sont envoyées manuellement à chaque navigation par
 * `route-tracker.tsx` (évite le double comptage en SPA).
 */
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
