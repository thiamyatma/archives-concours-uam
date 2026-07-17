"use client";

import { Download, RotateCcw, Sheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { QcmStatCards } from "@/components/admin/qcm-stat-cards";
import { QcmTopScores } from "@/components/admin/qcm-top-scores";
import { InsightsHeaderIcon, QcmInsightsPanel } from "@/components/admin/qcm-insights";
import {
  DepartementBarChart,
  MatierePieChart,
  PeriodEvolutionChart,
  ScoreLineChart,
  TimeByMatiereChart,
} from "@/components/admin/qcm-charts";
import { useQcmAnalytics } from "@/lib/hooks/use-qcm-analytics";
import { analyticsToCsv, analyticsToExcel } from "@/lib/qcm/analytics-export";
import { departementLabel, matiereLabel } from "@/lib/qcm/labels";
import type {
  QcmAnalytics,
  QcmAnalyticsFilters,
  QcmPeriod,
} from "@/lib/qcm/analytics-types";
import type { QcmFilterOptions } from "@/lib/qcm/analytics";

const ALL = "all";

const PERIOD_LABELS: Record<QcmPeriod, string> = {
  all: "Toutes les périodes",
  today: "Aujourd'hui",
  week: "7 derniers jours",
  month: "30 derniers jours",
  year: "12 derniers mois",
};

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function QcmAnalyticsDashboard({
  initialData,
  initialFilters,
  options,
}: {
  initialData: QcmAnalytics;
  initialFilters: QcmAnalyticsFilters;
  options: QcmFilterOptions;
}) {
  const { filters, data, isPending, setFilter, reset } = useQcmAnalytics(
    initialData,
    initialFilters
  );

  const hasData = data.summary.totalAttempts > 0;
  const today = new Date().toISOString().slice(0, 10);

  const periodEvolution = [
    { label: "Aujourd'hui", count: data.periodCounts.today },
    { label: "7 j", count: data.periodCounts.week },
    { label: "30 j", count: data.periodCounts.month },
    { label: "12 mois", count: data.periodCounts.year },
  ];

  const departementBars = data.byDepartement.map((d) => ({
    label: departementLabel(d.departementCode),
    count: d.count,
  }));

  return (
    <div className={cn("space-y-6", isPending && "opacity-70 transition-opacity")}>
      {/* Filtres + export */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FilterSelect
            label="Département"
            value={filters.departement ?? ALL}
            onValueChange={(v) => setFilter("departement", v === ALL ? null : v)}
            allLabel="Tous les départements"
            options={options.departements.map((c) => ({
              value: c,
              label: departementLabel(c),
            }))}
          />
          <FilterSelect
            label="Année"
            value={filters.annee !== null ? String(filters.annee) : ALL}
            onValueChange={(v) => setFilter("annee", v === ALL ? null : Number(v))}
            allLabel="Toutes les années"
            options={options.annees.map((a) => ({ value: String(a), label: String(a) }))}
          />
          <FilterSelect
            label="Matière"
            value={filters.matiere ?? ALL}
            onValueChange={(v) => setFilter("matiere", v === ALL ? null : v)}
            allLabel="Toutes les matières"
            options={options.matieres.map((m) => ({ value: m, label: matiereLabel(m) }))}
          />
          <FilterSelect
            label="Période"
            value={filters.period}
            onValueChange={(v) => setFilter("period", v as QcmPeriod)}
            allLabel={PERIOD_LABELS.all}
            options={(["today", "week", "month", "year"] as QcmPeriod[]).map((p) => ({
              value: p,
              label: PERIOD_LABELS[p],
            }))}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Réinitialiser
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasData}
            onClick={() =>
              downloadFile(
                analyticsToCsv(data),
                `qcm-analytics-${today}.csv`,
                "text/csv;charset=utf-8"
              )
            }
          >
            <Download className="size-4" aria-hidden="true" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasData}
            onClick={() =>
              downloadFile(
                analyticsToExcel(data),
                `qcm-analytics-${today}.xls`,
                "application/vnd.ms-excel;charset=utf-8"
              )
            }
          >
            <Sheet className="size-4" aria-hidden="true" />
            Excel
          </Button>
        </div>
      </div>

      <QcmStatCards summary={data.summary} loading={isPending} />

      {!hasData ? (
        <Card>
          <CardContent className="text-muted-foreground py-16 text-center text-sm">
            Aucune tentative de QCM enregistrée pour ces filtres. Les statistiques
            apparaîtront dès que des candidats termineront un entraînement.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Évolution des QCM réalisés">
              <PeriodEvolutionChart data={periodEvolution} />
            </ChartCard>
            <ChartCard title="Score moyen par jour">
              <ScoreLineChart data={data.scoresByDay} />
            </ChartCard>
            <ChartCard title="Répartition par matière">
              <MatierePieChart data={data.byMatiere} />
            </ChartCard>
            <ChartCard title="Répartition par département">
              <DepartementBarChart data={departementBars} />
            </ChartCard>
            <ChartCard title="Temps moyen par matière">
              <TimeByMatiereChart data={data.byMatiere} />
            </ChartCard>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <InsightsHeaderIcon
                    className="text-brand-blue size-4"
                    aria-hidden="true"
                  />
                  Insights automatiques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QcmInsightsPanel insights={data.insights} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meilleurs scores</CardTitle>
            </CardHeader>
            <CardContent>
              <QcmTopScores scores={data.topScores} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  allLabel,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
