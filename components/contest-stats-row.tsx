import { Download, Eye, FileText } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { ContestStatsToggles } from "@/lib/contest/types";

export interface ContestStatsValues {
  exams: number;
  downloads: number;
  views: number;
}

/**
 * Compteurs réels affichés sous la carte concours, chacun activable/
 * désactivable depuis /admin/parametres (`stats`). Sans directive :
 * utilisable côté serveur (page d'accueil) comme côté client (aperçu admin).
 */
export function ContestStatsRow({
  toggles,
  values,
}: {
  toggles: ContestStatsToggles;
  values: ContestStatsValues;
}) {
  const tiles = [
    {
      show: toggles.showExams,
      icon: FileText,
      value: values.exams,
      label: "Épreuves disponibles",
    },
    {
      show: toggles.showDownloads,
      icon: Download,
      value: values.downloads,
      label: "Téléchargements",
    },
    {
      show: toggles.showViews,
      icon: Eye,
      value: values.views,
      label: "Vues des épreuves",
    },
  ].filter((tile) => tile.show);

  if (tiles.length === 0) return null;

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="bg-card flex items-center gap-3 rounded-xl border px-4 py-3"
        >
          <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
            <tile.icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <dd className="text-xl font-bold tabular-nums">{formatNumber(tile.value)}</dd>
            <dt className="text-muted-foreground truncate text-xs">{tile.label}</dt>
          </div>
        </div>
      ))}
    </dl>
  );
}
