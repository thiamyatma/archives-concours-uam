/**
 * Types du tableau de bord Analytics QCM (/admin/analytics). Séparés du
 * module `analytics.ts` (server-only) pour être importables côté client
 * (dashboard, graphiques) et par les tests unitaires du calcul pur
 * (`analytics-compute.ts`).
 */

/** Ligne brute de `qcm_attempts` (camelCase), telle que lue puis normalisée. */
export interface QcmAttemptRow {
  groupe: string;
  annee: number;
  matiere: string;
  departementCode: string | null;
  candidateId: string | null;
  totalQuestions: number | null;
  correctAnswers: number | null;
  scorePercent: number | null;
  durationSeconds: number | null;
  completedAt: string;
}

export type QcmPeriod = "all" | "today" | "week" | "month" | "year";

export interface QcmAnalyticsFilters {
  departement: string | null;
  annee: number | null;
  matiere: string | null;
  period: QcmPeriod;
}

export const DEFAULT_QCM_FILTERS: QcmAnalyticsFilters = {
  departement: null,
  annee: null,
  matiere: null,
  period: "all",
};

export interface QcmSummaryStats {
  /** Toutes les tentatives (y compris anciennes lignes sans score détaillé). */
  totalAttempts: number;
  /** Tentatives avec un score renseigné (base des moyennes). */
  scoredAttempts: number;
  /** Moyenne des pourcentages de réussite (0-100), ou null si aucune donnée. */
  avgSuccessRate: number | null;
  /** Meilleur pourcentage enregistré, ou null. */
  bestScore: number | null;
  /** Moyenne du nombre de bonnes réponses (brut, ex. 13.4), ou null. */
  avgCorrectAnswers: number | null;
  /** Moyenne du nombre de questions par tentative (contexte du score moyen). */
  avgTotalQuestions: number | null;
  /** Durée moyenne en secondes, ou null. */
  avgDurationSeconds: number | null;
  /** Nombre de candidats distincts (candidate_id non nul). */
  uniqueCandidates: number;
}

export interface QcmByMatiere {
  matiere: string;
  count: number;
  avgScore: number | null;
  avgDurationSeconds: number | null;
}

export interface QcmByDepartement {
  departementCode: string;
  count: number;
  avgScore: number | null;
}

export interface QcmScoreByDay {
  date: string; // YYYY-MM-DD
  avgScore: number | null;
  count: number;
}

export interface QcmPeriodCounts {
  today: number;
  week: number;
  month: number;
  year: number;
}

export interface QcmHourBucket {
  hour: number; // 0-23
  count: number;
}

export interface QcmTopScore {
  scorePercent: number;
  correctAnswers: number | null;
  totalQuestions: number | null;
  departementCode: string | null;
  matiere: string;
  annee: number;
  durationSeconds: number | null;
  completedAt: string;
}

export interface QcmInsights {
  bestMatiere: { matiere: string; avgScore: number } | null;
  hardestMatiere: { matiere: string; avgScore: number } | null;
  peakHours: QcmHourBucket[];
  mostActiveDepartement: { departementCode: string; count: number } | null;
  successRateTrend: {
    direction: "up" | "down" | "stable";
    olderAvg: number;
    recentAvg: number;
  } | null;
  /** % de candidats (≥2 tentatives) dont la dernière tentative bat la première. */
  improvementRate: number | null;
}

export interface QcmAnalytics {
  summary: QcmSummaryStats;
  byMatiere: QcmByMatiere[];
  byDepartement: QcmByDepartement[];
  scoresByDay: QcmScoreByDay[];
  periodCounts: QcmPeriodCounts;
  hourly: QcmHourBucket[];
  topScores: QcmTopScore[];
  insights: QcmInsights;
}

export interface QcmCandidateSummary {
  candidateId: string;
  attempts: number;
  avgScore: number | null;
  bestScore: number | null;
  lastActivity: string;
}

export interface QcmCandidateProgression {
  candidateId: string;
  attempts: number;
  avgScore: number | null;
  bestScore: number | null;
  avgDurationSeconds: number | null;
  mostWorkedMatiere: string | null;
  /** Tentatives triées chronologiquement (courbe de progression). */
  timeline: {
    completedAt: string;
    matiere: string;
    departementCode: string | null;
    annee: number;
    scorePercent: number | null;
    durationSeconds: number | null;
  }[];
}
