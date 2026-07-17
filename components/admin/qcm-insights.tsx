import {
  Building2,
  Clock3,
  Lightbulb,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { departementLabel, matiereLabel } from "@/lib/qcm/labels";
import type { QcmInsights } from "@/lib/qcm/analytics-types";

/**
 * Section « Insights » : lectures automatiques des données (matière la plus
 * réussie/difficile, heures de pointe, département le plus actif, tendance du
 * taux de réussite, part de candidats qui progressent). Chaque insight n'est
 * rendu que s'il a assez de données pour être fiable.
 */
export function QcmInsightsPanel({ insights }: { insights: QcmInsights }) {
  const items: { icon: LucideIcon; tone: string; text: React.ReactNode }[] = [];

  if (insights.bestMatiere) {
    items.push({
      icon: ThumbsUp,
      tone: "text-emerald-600 dark:text-emerald-400",
      text: (
        <>
          Matière la plus réussie :{" "}
          <strong>{matiereLabel(insights.bestMatiere.matiere)}</strong> (
          {insights.bestMatiere.avgScore}% de réussite moyenne).
        </>
      ),
    });
  }
  if (
    insights.hardestMatiere &&
    insights.hardestMatiere.matiere !== insights.bestMatiere?.matiere
  ) {
    items.push({
      icon: TriangleAlert,
      tone: "text-amber-600 dark:text-amber-400",
      text: (
        <>
          Matière la plus difficile :{" "}
          <strong>{matiereLabel(insights.hardestMatiere.matiere)}</strong> (
          {insights.hardestMatiere.avgScore}% de réussite moyenne).
        </>
      ),
    });
  }
  if (insights.peakHours.length > 0) {
    items.push({
      icon: Clock3,
      tone: "text-brand-blue",
      text: (
        <>
          Heures les plus actives :{" "}
          <strong>
            {insights.peakHours
              .map((h) => `${String(h.hour).padStart(2, "0")}h`)
              .join(", ")}
          </strong>{" "}
          (UTC).
        </>
      ),
    });
  }
  if (insights.mostActiveDepartement) {
    items.push({
      icon: Building2,
      tone: "text-brand-blue",
      text: (
        <>
          Département le plus actif :{" "}
          <strong>
            {departementLabel(insights.mostActiveDepartement.departementCode)}
          </strong>{" "}
          ({insights.mostActiveDepartement.count} QCM).
        </>
      ),
    });
  }
  if (insights.successRateTrend) {
    const t = insights.successRateTrend;
    const up = t.direction === "up";
    const stable = t.direction === "stable";
    items.push({
      icon: up ? TrendingUp : stable ? TrendingUp : TrendingDown,
      tone: up
        ? "text-emerald-600 dark:text-emerald-400"
        : stable
          ? "text-muted-foreground"
          : "text-destructive",
      text: stable ? (
        <>
          Taux de réussite <strong>stable</strong> (~{t.recentAvg}%).
        </>
      ) : (
        <>
          Taux de réussite <strong>{up ? "en hausse" : "en baisse"}</strong> :{" "}
          {t.olderAvg}% → {t.recentAvg}% (tentatives anciennes vs récentes).
        </>
      ),
    });
  }
  if (insights.improvementRate !== null) {
    items.push({
      icon: TrendingUp,
      tone: "text-emerald-600 dark:text-emerald-400",
      text: (
        <>
          <strong>{insights.improvementRate}%</strong> des candidats à tentatives
          multiples améliorent leur score.
        </>
      ),
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        Pas encore assez de données pour dégager des tendances.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <item.icon
            className={`mt-0.5 size-4 shrink-0 ${item.tone}`}
            aria-hidden="true"
          />
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

export const InsightsHeaderIcon = Lightbulb;
