import type {
  QcmAnalytics,
  QcmAttemptRow,
  QcmByDepartement,
  QcmByMatiere,
  QcmCandidateProgression,
  QcmCandidateSummary,
  QcmHourBucket,
  QcmInsights,
  QcmPeriod,
  QcmPeriodCounts,
  QcmScoreByDay,
  QcmSummaryStats,
  QcmTopScore,
} from "@/lib/qcm/analytics-types";

/**
 * Calcul pur du tableau de bord Analytics QCM à partir des lignes brutes de
 * `qcm_attempts`. Aucune E/S, aucune dépendance serveur : entièrement testé
 * unitairement (`analytics-compute.test.ts`). Le module server-only
 * `analytics.ts` se contente de récupérer les lignes filtrées (via index en
 * base) puis d'appeler ces fonctions — une seule requête par vue.
 *
 * Choix assumé : agrégation en TypeScript plutôt qu'en fonctions PL/pgSQL.
 * Le volume est modeste (site d'archives, trafic limité), la requête filtrée
 * s'appuie sur les index, et la logique reste vérifiable par des tests — là
 * où des RPC SQL ne pourraient pas être exécutées/validées dans cet
 * environnement de développement.
 */

function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Bornes de la fenêtre glissante d'une période, en ms epoch (0 = pas de borne). */
export function periodStartMs(period: QcmPeriod, nowMs: number): number {
  const day = 24 * 60 * 60 * 1000;
  switch (period) {
    case "today": {
      const now = new Date(nowMs);
      return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    }
    case "week":
      return nowMs - 7 * day;
    case "month":
      return nowMs - 30 * day;
    case "year":
      return nowMs - 365 * day;
    default:
      return 0;
  }
}

const scored = (rows: QcmAttemptRow[]) =>
  rows.filter(
    (r): r is QcmAttemptRow & { scorePercent: number } => r.scorePercent !== null
  );

function computeSummary(rows: QcmAttemptRow[]): QcmSummaryStats {
  const withScore = scored(rows);
  const scores = withScore.map((r) => r.scorePercent);
  const corrects = rows
    .map((r) => r.correctAnswers)
    .filter((v): v is number => v !== null);
  const totals = rows.map((r) => r.totalQuestions).filter((v): v is number => v !== null);
  const durations = rows
    .map((r) => r.durationSeconds)
    .filter((v): v is number => v !== null);
  const candidates = new Set(
    rows.map((r) => r.candidateId).filter((v): v is string => v !== null)
  );

  const avgSuccess = mean(scores);
  const avgCorrect = mean(corrects);
  const avgTotal = mean(totals);
  const avgDuration = mean(durations);

  return {
    totalAttempts: rows.length,
    scoredAttempts: withScore.length,
    avgSuccessRate: avgSuccess === null ? null : round(avgSuccess, 1),
    bestScore: scores.length > 0 ? Math.max(...scores) : null,
    avgCorrectAnswers: avgCorrect === null ? null : round(avgCorrect, 1),
    avgTotalQuestions: avgTotal === null ? null : round(avgTotal, 1),
    avgDurationSeconds: avgDuration === null ? null : round(avgDuration),
    uniqueCandidates: candidates.size,
  };
}

function groupBy<R, T>(rows: R[], key: (r: R) => T): Map<T, R[]> {
  const map = new Map<T, R[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = map.get(k);
    if (bucket) bucket.push(row);
    else map.set(k, [row]);
  }
  return map;
}

function computeByMatiere(rows: QcmAttemptRow[]): QcmByMatiere[] {
  return Array.from(groupBy(rows, (r) => r.matiere).entries())
    .map(([matiere, group]) => {
      const avgScore = mean(scored(group).map((r) => r.scorePercent));
      const avgDuration = mean(
        group.map((r) => r.durationSeconds).filter((v): v is number => v !== null)
      );
      return {
        matiere,
        count: group.length,
        avgScore: avgScore === null ? null : round(avgScore, 1),
        avgDurationSeconds: avgDuration === null ? null : round(avgDuration),
      };
    })
    .sort((a, b) => b.count - a.count || a.matiere.localeCompare(b.matiere));
}

function computeByDepartement(rows: QcmAttemptRow[]): QcmByDepartement[] {
  const withDept = rows.filter(
    (r): r is QcmAttemptRow & { departementCode: string } => r.departementCode !== null
  );
  return Array.from(groupBy(withDept, (r) => r.departementCode).entries())
    .map(([departementCode, group]) => {
      const avgScore = mean(scored(group).map((r) => r.scorePercent));
      return {
        departementCode,
        count: group.length,
        avgScore: avgScore === null ? null : round(avgScore, 1),
      };
    })
    .sort(
      (a, b) => b.count - a.count || a.departementCode.localeCompare(b.departementCode)
    );
}

/** Clé jour (YYYY-MM-DD) en UTC pour un horodatage ISO. */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function computeScoresByDay(rows: QcmAttemptRow[]): QcmScoreByDay[] {
  return Array.from(groupBy(rows, (r) => dayKey(r.completedAt)).entries())
    .map(([date, group]) => {
      const avgScore = mean(scored(group).map((r) => r.scorePercent));
      return {
        date,
        avgScore: avgScore === null ? null : round(avgScore, 1),
        count: group.length,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function computePeriodCounts(
  rows: QcmAttemptRow[],
  nowMs: number
): QcmPeriodCounts {
  const countSince = (period: QcmPeriod) => {
    const threshold = periodStartMs(period, nowMs);
    return rows.filter((r) => new Date(r.completedAt).getTime() >= threshold).length;
  };
  return {
    today: countSince("today"),
    week: countSince("week"),
    month: countSince("month"),
    year: countSince("year"),
  };
}

function computeHourly(rows: QcmAttemptRow[]): QcmHourBucket[] {
  const counts = new Array(24).fill(0) as number[];
  for (const row of rows) {
    const hour = new Date(row.completedAt).getUTCHours();
    if (hour >= 0 && hour < 24) counts[hour] += 1;
  }
  return counts.map((count, hour) => ({ hour, count }));
}

function computeTopScores(rows: QcmAttemptRow[], limit = 10): QcmTopScore[] {
  return scored(rows)
    .slice()
    .sort(
      (a, b) =>
        b.scorePercent - a.scorePercent ||
        (a.durationSeconds ?? Infinity) - (b.durationSeconds ?? Infinity) ||
        a.completedAt.localeCompare(b.completedAt)
    )
    .slice(0, limit)
    .map((r) => ({
      scorePercent: r.scorePercent,
      correctAnswers: r.correctAnswers,
      totalQuestions: r.totalQuestions,
      departementCode: r.departementCode,
      matiere: r.matiere,
      annee: r.annee,
      durationSeconds: r.durationSeconds,
      completedAt: r.completedAt,
    }));
}

/** Seuil minimal de tentatives pour qu'une matière soit éligible aux insights. */
const MIN_INSIGHT_ATTEMPTS = 3;

function computeInsights(rows: QcmAttemptRow[]): QcmInsights {
  const byMatiere = computeByMatiere(rows).filter(
    (m) => m.avgScore !== null && m.count >= MIN_INSIGHT_ATTEMPTS
  );
  const byDept = computeByDepartement(rows);
  const hourly = computeHourly(rows);

  const rankedMatiere = byMatiere
    .slice()
    .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));
  const bestMatiere = rankedMatiere[0]
    ? { matiere: rankedMatiere[0].matiere, avgScore: rankedMatiere[0].avgScore! }
    : null;
  const hardestMatiere =
    rankedMatiere.length > 0
      ? {
          matiere: rankedMatiere[rankedMatiere.length - 1].matiere,
          avgScore: rankedMatiere[rankedMatiere.length - 1].avgScore!,
        }
      : null;

  const peakHours = hourly
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count || a.hour - b.hour)
    .slice(0, 3);

  const mostActiveDepartement = byDept[0]
    ? { departementCode: byDept[0].departementCode, count: byDept[0].count }
    : null;

  const successRateTrend = computeTrend(rows);
  const improvementRate = computeImprovementRate(rows);

  return {
    bestMatiere,
    hardestMatiere,
    peakHours,
    mostActiveDepartement,
    successRateTrend,
    improvementRate,
  };
}

function computeTrend(rows: QcmAttemptRow[]): QcmInsights["successRateTrend"] {
  const withScore = scored(rows)
    .slice()
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  if (withScore.length < 4) return null;

  const mid = Math.floor(withScore.length / 2);
  const olderAvg = mean(withScore.slice(0, mid).map((r) => r.scorePercent));
  const recentAvg = mean(withScore.slice(mid).map((r) => r.scorePercent));
  if (olderAvg === null || recentAvg === null) return null;

  const delta = recentAvg - olderAvg;
  const direction = delta > 2 ? "up" : delta < -2 ? "down" : "stable";
  return { direction, olderAvg: round(olderAvg, 1), recentAvg: round(recentAvg, 1) };
}

function computeImprovementRate(rows: QcmAttemptRow[]): number | null {
  const byCandidate = groupBy(
    scored(rows).filter((r) => r.candidateId !== null),
    (r) => r.candidateId!
  );
  const multi = Array.from(byCandidate.values()).filter((g) => g.length >= 2);
  if (multi.length === 0) return null;

  let improved = 0;
  for (const group of multi) {
    const sorted = group
      .slice()
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    if (sorted[sorted.length - 1].scorePercent > sorted[0].scorePercent) improved += 1;
  }
  return round((improved / multi.length) * 100, 1);
}

export function computeAnalytics(rows: QcmAttemptRow[], nowMs: number): QcmAnalytics {
  return {
    summary: computeSummary(rows),
    byMatiere: computeByMatiere(rows),
    byDepartement: computeByDepartement(rows),
    scoresByDay: computeScoresByDay(rows),
    periodCounts: computePeriodCounts(rows, nowMs),
    hourly: computeHourly(rows),
    topScores: computeTopScores(rows),
    insights: computeInsights(rows),
  };
}

// --- Progression par candidat -----------------------------------------

export function computeCandidatesList(rows: QcmAttemptRow[]): QcmCandidateSummary[] {
  const byCandidate = groupBy(
    rows.filter((r) => r.candidateId !== null),
    (r) => r.candidateId!
  );
  return Array.from(byCandidate.entries())
    .map(([candidateId, group]) => {
      const scores = scored(group).map((r) => r.scorePercent);
      const avg = mean(scores);
      const lastActivity = group
        .map((r) => r.completedAt)
        .sort((a, b) => b.localeCompare(a))[0];
      return {
        candidateId,
        attempts: group.length,
        avgScore: avg === null ? null : round(avg, 1),
        bestScore: scores.length > 0 ? Math.max(...scores) : null,
        lastActivity,
      };
    })
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}

export function computeCandidateProgression(
  candidateId: string,
  rows: QcmAttemptRow[]
): QcmCandidateProgression {
  const timeline = rows
    .slice()
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
    .map((r) => ({
      completedAt: r.completedAt,
      matiere: r.matiere,
      departementCode: r.departementCode,
      annee: r.annee,
      scorePercent: r.scorePercent,
      durationSeconds: r.durationSeconds,
    }));

  const scores = scored(rows).map((r) => r.scorePercent);
  const avg = mean(scores);
  const avgDuration = mean(
    rows.map((r) => r.durationSeconds).filter((v): v is number => v !== null)
  );

  const matiereCounts = groupBy(rows, (r) => r.matiere);
  const mostWorkedMatiere =
    Array.from(matiereCounts.entries()).sort(
      (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])
    )[0]?.[0] ?? null;

  return {
    candidateId,
    attempts: rows.length,
    avgScore: avg === null ? null : round(avg, 1),
    bestScore: scores.length > 0 ? Math.max(...scores) : null,
    avgDurationSeconds: avgDuration === null ? null : round(avgDuration),
    mostWorkedMatiere,
    timeline,
  };
}
