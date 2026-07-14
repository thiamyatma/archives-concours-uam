"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { pageview } from "@/lib/analytics/gtag";

/**
 * Envoie un `page_view` GA4 à chaque changement de route. Nécessaire en
 * App Router car les navigations SPA ne rechargent pas la page (gtag est
 * configuré avec `send_page_view: false`). Rendu seulement quand le
 * consentement est accordé (voir analytics.tsx).
 *
 * `useSearchParams` impose un `<Suspense>` autour de ce composant, sinon le
 * build App Router échoue — l'enveloppe est faite par l'appelant.
 */
export function RouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    pageview(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  return null;
}
