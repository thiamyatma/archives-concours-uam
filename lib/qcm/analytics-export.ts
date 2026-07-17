import type { QcmAnalytics } from "@/lib/qcm/analytics-types";

/**
 * Sérialisation du tableau de bord Analytics QCM pour export. Fonctions
 * pures (aucun DOM) : le composant client construit un Blob à partir des
 * chaînes retournées. L'export « Excel » réutilise le CSV avec séparateur
 * point-virgule et BOM UTF-8, que Microsoft Excel ouvre nativement en
 * colonnes (fr-FR) — évite d'ajouter une dépendance type SheetJS pour un
 * besoin admin ponctuel.
 */

function escapeCsv(value: string | number | null, sep: string): string {
  if (value === null) return "";
  const str = String(value);
  if (str.includes(sep) || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: (string | number | null)[][], sep: string): string {
  return rows
    .map((row) => row.map((cell) => escapeCsv(cell, sep)).join(sep))
    .join("\r\n");
}

/** Construit les lignes (tableau de tableaux) résumant tout le tableau de bord. */
export function buildAnalyticsRows(
  analytics: QcmAnalytics
): (string | number | null)[][] {
  const s = analytics.summary;
  const rows: (string | number | null)[][] = [
    ["Section", "Indicateur", "Valeur", "Détail"],
    ["Résumé", "QCM réalisés", s.totalAttempts, ""],
    ["Résumé", "Candidats uniques", s.uniqueCandidates, ""],
    ["Résumé", "Taux de réussite moyen (%)", s.avgSuccessRate ?? "", ""],
    ["Résumé", "Meilleur score (%)", s.bestScore ?? "", ""],
    ["Résumé", "Score moyen (bonnes réponses)", s.avgCorrectAnswers ?? "", ""],
    ["Résumé", "Temps moyen (s)", s.avgDurationSeconds ?? "", ""],
  ];

  for (const m of analytics.byMatiere) {
    rows.push([
      "Par matière",
      m.matiere,
      m.count,
      `score moyen ${m.avgScore ?? "-"}% ; temps moyen ${m.avgDurationSeconds ?? "-"}s`,
    ]);
  }
  for (const d of analytics.byDepartement) {
    rows.push([
      "Par département",
      d.departementCode,
      d.count,
      `score moyen ${d.avgScore ?? "-"}%`,
    ]);
  }
  for (const day of analytics.scoresByDay) {
    rows.push(["Score par jour", day.date, day.avgScore ?? "", `${day.count} QCM`]);
  }
  analytics.topScores.forEach((t, i) => {
    rows.push([
      "Meilleurs scores",
      `#${i + 1}`,
      `${t.scorePercent}%`,
      `${t.matiere} ${t.annee} (${t.departementCode ?? "-"}) — ${t.durationSeconds ?? "-"}s — ${t.completedAt.slice(0, 10)}`,
    ]);
  });

  return rows;
}

export function analyticsToCsv(analytics: QcmAnalytics): string {
  return toCsv(buildAnalyticsRows(analytics), ",");
}

/** Variante « Excel » : point-virgule + BOM UTF-8 (ouverture directe fr-FR). */
export function analyticsToExcel(analytics: QcmAnalytics): string {
  return `﻿${toCsv(buildAnalyticsRows(analytics), ";")}`;
}
