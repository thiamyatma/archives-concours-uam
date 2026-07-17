import { z } from "zod";
import type { QcmAnalyticsFilters } from "@/lib/qcm/analytics-types";

/**
 * Validation des filtres du tableau de bord Analytics QCM. Les filtres
 * viennent du client (Server Action / hook) : chaînes vides ou `"all"`
 * signifient « pas de filtre » et sont normalisées en `null`.
 */

const emptyToNull = (value: unknown) =>
  value === "" || value === "all" || value === undefined ? null : value;

export const qcmAnalyticsFiltersSchema = z.object({
  departement: z.preprocess(emptyToNull, z.string().max(50).nullable()).default(null),
  annee: z
    .preprocess(
      (v) => (v === "" || v === "all" || v === undefined ? null : Number(v)),
      z.number().int().min(2000).max(2100).nullable()
    )
    .default(null),
  matiere: z.preprocess(emptyToNull, z.string().max(100).nullable()).default(null),
  period: z.enum(["all", "today", "week", "month", "year"]).default("all"),
});

export type QcmAnalyticsFiltersInput = z.input<typeof qcmAnalyticsFiltersSchema>;

export function parseQcmFilters(input: unknown): QcmAnalyticsFilters {
  const result = qcmAnalyticsFiltersSchema.safeParse(input ?? {});
  return result.success
    ? result.data
    : { departement: null, annee: null, matiere: null, period: "all" };
}
