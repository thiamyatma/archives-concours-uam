import { BarChart3, ClipboardList, Clock, Target, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { formatDuration } from "@/lib/qcm/labels";
import type { QcmSummaryStats } from "@/lib/qcm/analytics-types";

/** Cartes d'indicateurs clés du tableau de bord Analytics QCM. */
export function QcmStatCards({
  summary,
  loading,
}: {
  summary: QcmSummaryStats;
  loading: boolean;
}) {
  const cards: { icon: LucideIcon; label: string; value: string }[] = [
    {
      icon: Target,
      label: "Taux de réussite moyen",
      value: summary.avgSuccessRate === null ? "—" : `${summary.avgSuccessRate}%`,
    },
    {
      icon: Trophy,
      label: "Meilleur score",
      value: summary.bestScore === null ? "—" : `${summary.bestScore}%`,
    },
    {
      icon: BarChart3,
      label: "Score moyen",
      value:
        summary.avgCorrectAnswers === null
          ? "—"
          : `${summary.avgCorrectAnswers} / ${summary.avgTotalQuestions ?? "?"}`,
    },
    {
      icon: ClipboardList,
      label: "QCM réalisés",
      value: formatNumber(summary.totalAttempts),
    },
    {
      icon: Clock,
      label: "Temps moyen",
      value: formatDuration(summary.avgDurationSeconds),
    },
    {
      icon: Users,
      label: "Candidats uniques",
      value: formatNumber(summary.uniqueCandidates),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center gap-3 py-2">
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
              <card.icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="truncate text-xl font-bold tabular-nums sm:text-2xl">
                  {card.value}
                </p>
              )}
              <p className="text-muted-foreground truncate text-xs">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
