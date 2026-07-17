"use server";

import { requireAdminSession } from "@/lib/actions/admin-auth";
import { getQcmAnalytics } from "@/lib/qcm/analytics";
import {
  parseQcmFilters,
  type QcmAnalyticsFiltersInput,
} from "@/lib/qcm/analytics-schema";
import type { QcmAnalytics } from "@/lib/qcm/analytics-types";

/**
 * Server Action de rafraîchissement du tableau de bord Analytics QCM quand
 * l'administrateur change un filtre (voir lib/hooks/use-qcm-analytics.ts).
 * Protégée : les statistiques ne sont accessibles qu'à une session admin
 * valide, même si l'action est appelée directement.
 */
export async function fetchQcmAnalyticsAction(
  filters: QcmAnalyticsFiltersInput
): Promise<QcmAnalytics> {
  await requireAdminSession();
  return getQcmAnalytics(parseQcmFilters(filters));
}
