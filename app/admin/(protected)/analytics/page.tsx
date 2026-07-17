import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QcmAnalyticsDashboard } from "@/components/admin/qcm-analytics-dashboard";
import { getQcmAnalytics, getQcmFilterOptions } from "@/lib/qcm/analytics";
import { parseQcmFilters } from "@/lib/qcm/analytics-schema";

export const metadata: Metadata = { title: "Admin — Analytics QCM" };
export const dynamic = "force-dynamic";

export default async function QcmAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const filters = parseQcmFilters({
    departement: raw.departement,
    annee: raw.annee,
    matiere: raw.matiere,
    period: raw.period,
  });

  const [analytics, options] = await Promise.all([
    getQcmAnalytics(filters),
    getQcmFilterOptions(),
  ]);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics QCM</h1>
          <p className="text-muted-foreground text-sm">
            Utilisation de l&apos;entraînement QCM, mise à jour en temps réel.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/analytics/candidats">
            <Users className="size-4" aria-hidden="true" />
            Progression des candidats
          </Link>
        </Button>
      </div>

      <QcmAnalyticsDashboard
        initialData={analytics}
        initialFilters={filters}
        options={options}
      />
    </div>
  );
}
