import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import {
  computeAnalytics,
  computeCandidateProgression,
  computeCandidatesList,
  periodStartMs,
} from "@/lib/qcm/analytics-compute";
import type {
  QcmAnalytics,
  QcmAnalyticsFilters,
  QcmAttemptRow,
  QcmCandidateProgression,
  QcmCandidateSummary,
} from "@/lib/qcm/analytics-types";
import type { Database } from "@/types/database";

/**
 * Accès aux données du tableau de bord Analytics QCM. Une seule requête
 * filtrée par vue (filtres département/année/matière/période poussés en base
 * via les index de qcm_attempts), puis agrégation en TypeScript pur
 * (`analytics-compute.ts`, testé). Défensif comme le reste des lectures
 * Supabase : repli sur un jeu vide si la base est indisponible, jamais
 * d'erreur remontée à la page admin.
 */

type QcmAttemptDbRow = Database["public"]["Tables"]["qcm_attempts"]["Row"];

// Plafond de sécurité : borne le volume rapatrié même si la table grossit
// beaucoup. Au-delà, les stats resteraient représentatives (échantillon des
// plus récents, ordre completed_at desc).
const MAX_ROWS = 50_000;

function normalize(row: QcmAttemptDbRow): QcmAttemptRow {
  // `?? null` : avant l'application de la migration analytics, PostgREST
  // renvoie des lignes sans ces colonnes (valeur `undefined`) — on les
  // ramène à `null` pour que le calcul reste correct dans cette fenêtre.
  return {
    groupe: row.groupe,
    annee: row.annee,
    matiere: row.matiere,
    departementCode: row.departement_code ?? null,
    candidateId: row.candidate_id ?? null,
    totalQuestions: row.total_questions ?? null,
    correctAnswers: row.correct_answers ?? null,
    scorePercent: row.score_percent ?? null,
    durationSeconds: row.duration_seconds ?? null,
    completedAt: row.completed_at,
  };
}

async function fetchRows(filters: QcmAnalyticsFilters): Promise<QcmAttemptRow[]> {
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (error) {
    console.error("getQcmAnalytics a échoué (client):", error);
    return [];
  }

  let query = supabase
    .from("qcm_attempts")
    .select("*")
    .order("completed_at", { ascending: false })
    .limit(MAX_ROWS);

  if (filters.departement) query = query.eq("departement_code", filters.departement);
  if (filters.annee !== null) query = query.eq("annee", filters.annee);
  if (filters.matiere) query = query.eq("matiere", filters.matiere);
  if (filters.period !== "all") {
    const threshold = periodStartMs(filters.period, Date.now());
    query = query.gte("completed_at", new Date(threshold).toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error("getQcmAnalytics a échoué:", error.message);
    return [];
  }
  return (data ?? []).map(normalize);
}

export async function getQcmAnalytics(
  filters: QcmAnalyticsFilters
): Promise<QcmAnalytics> {
  const rows = await fetchRows(filters);
  return computeAnalytics(rows, Date.now());
}

export interface QcmFilterOptions {
  departements: string[];
  annees: number[];
  matieres: string[];
}

/** Valeurs distinctes présentes en base, pour peupler les listes de filtres. */
export async function getQcmFilterOptions(): Promise<QcmFilterOptions> {
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return { departements: [], annees: [], matieres: [] };
  }

  const { data, error } = await supabase
    .from("qcm_attempts")
    .select("departement_code, annee, matiere")
    .limit(MAX_ROWS);
  if (error || !data) return { departements: [], annees: [], matieres: [] };

  const departements = new Set<string>();
  const annees = new Set<number>();
  const matieres = new Set<string>();
  for (const row of data) {
    if (row.departement_code) departements.add(row.departement_code);
    annees.add(row.annee);
    matieres.add(row.matiere);
  }
  return {
    departements: Array.from(departements).sort(),
    annees: Array.from(annees).sort((a, b) => b - a),
    matieres: Array.from(matieres).sort(),
  };
}

/** Candidats (jetons anonymes) ayant au moins une tentative rattachable. */
export async function getQcmCandidates(): Promise<QcmCandidateSummary[]> {
  const rows = await fetchRows({
    departement: null,
    annee: null,
    matiere: null,
    period: "all",
  });
  return computeCandidatesList(rows);
}

/** Progression détaillée d'un candidat, ou `null` si aucune tentative rattachée. */
export async function getQcmCandidateProgression(
  candidateId: string
): Promise<QcmCandidateProgression | null> {
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return null;
  }

  const { data, error } = await supabase
    .from("qcm_attempts")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("completed_at", { ascending: true })
    .limit(MAX_ROWS);
  if (error || !data || data.length === 0) return null;

  return computeCandidateProgression(candidateId, data.map(normalize));
}
