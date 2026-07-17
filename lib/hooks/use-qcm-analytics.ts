"use client";

import { useCallback, useState, useTransition } from "react";
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
 * transition (état `isPending` -> squelettes) sans navigation de page.
 */
export function useQcmAnalytics(
  initialData: QcmAnalytics,
  initialFilters: QcmAnalyticsFilters = DEFAULT_QCM_FILTERS
) {
  const [filters, setFilters] = useState<QcmAnalyticsFilters>(initialFilters);
  const [data, setData] = useState<QcmAnalytics>(initialData);
  const [isPending, startTransition] = useTransition();

  const applyFilters = useCallback((next: QcmAnalyticsFilters) => {
    setFilters(next);
    startTransition(async () => {
      const fresh = await fetchQcmAnalyticsAction(next);
      setData(fresh);
    });
  }, []);

  const setFilter = useCallback(
    <K extends keyof QcmAnalyticsFilters>(key: K, value: QcmAnalyticsFilters[K]) => {
      setFilters((current) => {
        const next = { ...current, [key]: value };
        startTransition(async () => {
          const fresh = await fetchQcmAnalyticsAction(next);
          setData(fresh);
        });
        return next;
      });
    },
    []
  );

  const reset = useCallback(() => applyFilters(DEFAULT_QCM_FILTERS), [applyFilters]);

  return { filters, data, isPending, setFilter, applyFilters, reset };
}
