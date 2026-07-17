import { z } from "zod";
import type { QcmAnalyticsFilters } from "@/lib/qcm/analytics-types";

/**
 * Validation des filtres du tableau de bord Analytics QCM. Les filtres
 * viennent de deux sources aux formes différentes : les `searchParams` du
 * premier rendu (chaînes ou `undefined`) et le hook client (valeurs déjà
 * typées, dont des `null` explicites). `""`, `"all"`, `undefined` et `null`
 * signifient tous « pas de filtre » et sont normalisés en `null` — `null`
 * doit impérativement être accepté ici : c'est la forme envoyée par
 * `useQcmAnalytics` à chaque changement de filtre.
 */

const isNoFilter = (value: unknown) =>
  value === "" || value === "all" || value === undefined || value === null;

const emptyToNull = (value: unknown) => (isNoFilter(value) ? null : value);

export const qcmAnalyticsFiltersSchema = z.object({
  departement: z.preprocess(emptyToNull, z.string().max(50).nullable()).default(null),
  annee: z
    .preprocess(
      (v) => (isNoFilter(v) ? null : Number(v)),
      z.number().int().min(2000).max(2100).nullable()
    )
    .default(null),
  matiere: z.preprocess(emptyToNull, z.string().max(100).nullable()).default(null),
  period: z.enum(["all", "today", "week", "month", "year"]).default("all"),
});

export type QcmAnalyticsFiltersInput = z.input<typeof qcmAnalyticsFiltersSchema>;

export function parseQcmFilters(input: unknown): QcmAnalyticsFilters {
  const result = qcmAnalyticsFiltersSchema.safeParse(input ?? {});
  if (result.success) return result.data;

  // Un échec ici signifie une entrée réellement invalide (ex. année hors
  // bornes) — le repli sur « aucun filtre » est le comportement voulu, mais
  // il doit rester visible dans les logs : un repli silencieux avait masqué
  // un bug de parse (annee: null rejeté) qui annulait tous les filtres.
  console.error(
    "parseQcmFilters: entrée invalide, repli sans filtre:",
    result.error.message
  );
  return { departement: null, annee: null, matiere: null, period: "all" };
}
