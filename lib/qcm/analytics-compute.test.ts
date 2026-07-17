import { describe, expect, it } from "vitest";
import {
  computeAnalytics,
  computeCandidateProgression,
  computeCandidatesList,
  computePeriodCounts,
  periodStartMs,
} from "@/lib/qcm/analytics-compute";
import type { QcmAttemptRow } from "@/lib/qcm/analytics-types";

function attempt(overrides: Partial<QcmAttemptRow> = {}): QcmAttemptRow {
  return {
    groupe: "dsti-dgae-dstaan",
    annee: 2024,
    matiere: "mathematiques",
    departementCode: "dsti",
    candidateId: "cand-1",
    totalQuestions: 20,
    correctAnswers: 10,
    scorePercent: 50,
    durationSeconds: 300,
    completedAt: "2026-07-10T09:00:00.000Z",
    ...overrides,
  };
}

describe("computeAnalytics — summary", () => {
  it("calcule les indicateurs de synthèse", () => {
    const rows = [
      attempt({
        scorePercent: 40,
        correctAnswers: 8,
        durationSeconds: 200,
        candidateId: "a",
      }),
      attempt({
        scorePercent: 60,
        correctAnswers: 12,
        durationSeconds: 400,
        candidateId: "b",
      }),
      attempt({
        scorePercent: 80,
        correctAnswers: 16,
        durationSeconds: 300,
        candidateId: "a",
      }),
    ];
    const { summary } = computeAnalytics(rows, Date.parse("2026-07-16T00:00:00Z"));

    expect(summary.totalAttempts).toBe(3);
    expect(summary.scoredAttempts).toBe(3);
    expect(summary.avgSuccessRate).toBe(60); // (40+60+80)/3
    expect(summary.bestScore).toBe(80);
    expect(summary.avgCorrectAnswers).toBe(12); // (8+12+16)/3
    expect(summary.avgTotalQuestions).toBe(20);
    expect(summary.avgDurationSeconds).toBe(300);
    expect(summary.uniqueCandidates).toBe(2); // a, b
  });

  it("ignore les anciennes lignes sans score dans les moyennes mais les compte dans le total", () => {
    const rows = [
      attempt({ scorePercent: 100, correctAnswers: 20 }),
      attempt({
        scorePercent: null,
        correctAnswers: null,
        totalQuestions: null,
        durationSeconds: null,
        candidateId: null,
      }),
    ];
    const { summary } = computeAnalytics(rows, Date.now());

    expect(summary.totalAttempts).toBe(2);
    expect(summary.scoredAttempts).toBe(1);
    expect(summary.avgSuccessRate).toBe(100);
    expect(summary.uniqueCandidates).toBe(1);
  });

  it("renvoie des null cohérents quand aucune donnée n'a de score", () => {
    const { summary } = computeAnalytics([], Date.now());
    expect(summary.totalAttempts).toBe(0);
    expect(summary.avgSuccessRate).toBeNull();
    expect(summary.bestScore).toBeNull();
    expect(summary.avgDurationSeconds).toBeNull();
  });
});

describe("computeAnalytics — regroupements", () => {
  const rows = [
    attempt({ matiere: "mathematiques", departementCode: "dsti", scorePercent: 50 }),
    attempt({ matiere: "mathematiques", departementCode: "dsti", scorePercent: 70 }),
    attempt({ matiere: "logique", departementCode: "dgo", scorePercent: 90 }),
  ];

  it("agrège par matière, trié par nombre de tentatives", () => {
    const { byMatiere } = computeAnalytics(rows, Date.now());
    expect(byMatiere[0]).toMatchObject({
      matiere: "mathematiques",
      count: 2,
      avgScore: 60,
    });
    expect(byMatiere[1]).toMatchObject({ matiere: "logique", count: 1, avgScore: 90 });
  });

  it("agrège par département", () => {
    const { byDepartement } = computeAnalytics(rows, Date.now());
    expect(byDepartement.find((d) => d.departementCode === "dsti")).toMatchObject({
      count: 2,
      avgScore: 60,
    });
  });

  it("meilleurs scores triés par score puis durée la plus courte", () => {
    const tie = [
      attempt({
        scorePercent: 90,
        durationSeconds: 500,
        completedAt: "2026-07-01T00:00:00Z",
      }),
      attempt({
        scorePercent: 90,
        durationSeconds: 120,
        completedAt: "2026-07-02T00:00:00Z",
      }),
      attempt({
        scorePercent: 100,
        durationSeconds: 999,
        completedAt: "2026-07-03T00:00:00Z",
      }),
    ];
    const { topScores } = computeAnalytics(tie, Date.now());
    expect(topScores[0].scorePercent).toBe(100);
    expect(topScores[1]).toMatchObject({ scorePercent: 90, durationSeconds: 120 });
    expect(topScores[2]).toMatchObject({ scorePercent: 90, durationSeconds: 500 });
  });
});

describe("computePeriodCounts", () => {
  it("compte les tentatives dans des fenêtres imbriquées", () => {
    const now = Date.parse("2026-07-16T12:00:00Z");
    const rows = [
      attempt({ completedAt: "2026-07-16T08:00:00Z" }), // aujourd'hui
      attempt({ completedAt: "2026-07-12T08:00:00Z" }), // cette semaine
      attempt({ completedAt: "2026-06-30T08:00:00Z" }), // ce mois
      attempt({ completedAt: "2026-01-05T08:00:00Z" }), // cette année
      attempt({ completedAt: "2024-01-05T08:00:00Z" }), // hors année
    ];
    const counts = computePeriodCounts(rows, now);
    expect(counts.today).toBe(1);
    expect(counts.week).toBe(2);
    expect(counts.month).toBe(3);
    expect(counts.year).toBe(4);
  });

  it("periodStartMs('all') ne borne rien", () => {
    expect(periodStartMs("all", Date.now())).toBe(0);
  });
});

describe("computeAnalytics — insights", () => {
  it("identifie meilleure et pire matière (seuil de tentatives respecté)", () => {
    const rows = [
      ...Array.from({ length: 3 }, () =>
        attempt({ matiere: "logique", scorePercent: 90 })
      ),
      ...Array.from({ length: 3 }, () =>
        attempt({ matiere: "mathematiques", scorePercent: 40 })
      ),
      attempt({ matiere: "anglais", scorePercent: 100 }), // 1 seule tentative -> ignorée
    ];
    const { insights } = computeAnalytics(rows, Date.now());
    expect(insights.bestMatiere).toMatchObject({ matiere: "logique", avgScore: 90 });
    expect(insights.hardestMatiere).toMatchObject({
      matiere: "mathematiques",
      avgScore: 40,
    });
  });

  it("calcule le taux d'amélioration des candidats à tentatives multiples", () => {
    const rows = [
      // candidat A : progresse (40 -> 80)
      attempt({
        candidateId: "A",
        scorePercent: 40,
        completedAt: "2026-07-01T00:00:00Z",
      }),
      attempt({
        candidateId: "A",
        scorePercent: 80,
        completedAt: "2026-07-02T00:00:00Z",
      }),
      // candidat B : régresse (70 -> 50)
      attempt({
        candidateId: "B",
        scorePercent: 70,
        completedAt: "2026-07-01T00:00:00Z",
      }),
      attempt({
        candidateId: "B",
        scorePercent: 50,
        completedAt: "2026-07-02T00:00:00Z",
      }),
      // candidat C : une seule tentative -> ignoré
      attempt({ candidateId: "C", scorePercent: 100 }),
    ];
    const { insights } = computeAnalytics(rows, Date.now());
    expect(insights.improvementRate).toBe(50); // 1 sur 2 progresse
  });

  it("détecte la tendance à la hausse du taux de réussite", () => {
    const rows = [
      attempt({ scorePercent: 30, completedAt: "2026-07-01T00:00:00Z" }),
      attempt({ scorePercent: 35, completedAt: "2026-07-02T00:00:00Z" }),
      attempt({ scorePercent: 80, completedAt: "2026-07-03T00:00:00Z" }),
      attempt({ scorePercent: 85, completedAt: "2026-07-04T00:00:00Z" }),
    ];
    const { insights } = computeAnalytics(rows, Date.now());
    expect(insights.successRateTrend?.direction).toBe("up");
  });
});

describe("progression candidat", () => {
  it("liste les candidats triés par dernière activité", () => {
    const rows = [
      attempt({ candidateId: "old", completedAt: "2026-07-01T00:00:00Z" }),
      attempt({ candidateId: "recent", completedAt: "2026-07-15T00:00:00Z" }),
      attempt({ candidateId: null }),
    ];
    const list = computeCandidatesList(rows);
    expect(list.map((c) => c.candidateId)).toEqual(["recent", "old"]);
  });

  it("construit la timeline et les agrégats d'un candidat", () => {
    const rows = [
      attempt({
        matiere: "logique",
        scorePercent: 60,
        completedAt: "2026-07-02T00:00:00Z",
      }),
      attempt({
        matiere: "logique",
        scorePercent: 90,
        completedAt: "2026-07-01T00:00:00Z",
      }),
      attempt({
        matiere: "mathematiques",
        scorePercent: 30,
        completedAt: "2026-07-03T00:00:00Z",
      }),
    ];
    const prog = computeCandidateProgression("cand-1", rows);
    expect(prog.attempts).toBe(3);
    expect(prog.bestScore).toBe(90);
    expect(prog.avgScore).toBe(60);
    expect(prog.mostWorkedMatiere).toBe("logique");
    // timeline triée chronologiquement
    expect(prog.timeline.map((t) => t.scorePercent)).toEqual([90, 60, 30]);
  });
});
