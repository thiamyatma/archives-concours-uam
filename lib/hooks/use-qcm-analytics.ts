"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { fetchQcmAnalyticsAction } from "@/lib/actions/qcm-analytics";
import {
  DEFAULT_QCM_FILTERS,
  type QcmAnalytics,
  type QcmAnalyticsFilters,
} from "@/lib/qcm/analytics-types";

/**
 * État + rafraîchissement du tableau de bord Analytics QCM côté client. Le
 * premier rendu utilise les données déjà calculées côté serveur (`initial`),
 * puis chaque changement de filtre relance `fetchQcmAnalyticsAction` via une
 * transition (état `isPending`) sans navigation de page.
 *
 * Deux gardes délibérées :
 * - le fetch est déclenché depuis le handler (jamais dans un updater
 *   `setState`, qui doit rester pur — StrictMode l'invoquerait deux fois) ;
 * - un numéro de séquence ignore toute réponse dépassée par une requête plus
 *   récente : sinon, deux changements de filtre rapprochés laisseraient la
 *   réponse la plus LENTE écraser la plus récente à l'écran.
 */
export function useQcmAnalytics(
  initialData: QcmAnalytics,
  initialFilters: QcmAnalyticsFilters = DEFAULT_QCM_FILTERS
) {
  const [filters, setFilters] = useState<QcmAnalyticsFilters>(initialFilters);
  const [data, setData] = useState<QcmAnalytics>(initialData);
  const [isPending, startTransition] = useTransition();
  const requestSeq = useRef(0);

  const applyFilters = useCallback((next: QcmAnalyticsFilters) => {
    setFilters(next);
    const seq = ++requestSeq.current;
    startTransition(async () => {
      const fresh = await fetchQcmAnalyticsAction(next);
      if (seq === requestSeq.current) setData(fresh);
    });
  }, []);

  const setFilter = useCallback(
    <K extends keyof QcmAnalyticsFilters>(key: K, value: QcmAnalyticsFilters[K]) => {
      applyFilters({ ...filters, [key]: value });
    },
    [filters, applyFilters]
  );

  const reset = useCallback(() => applyFilters(DEFAULT_QCM_FILTERS), [applyFilters]);

  return { filters, data, isPending, setFilter, applyFilters, reset };
}
