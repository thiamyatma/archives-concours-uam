import { Download, FileStack, Users } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { GlobalStats } from "@/lib/data/stats";

export function StatsSection({ stats }: { stats: GlobalStats }) {
  const items = [
    {
      icon: FileStack,
      label: "Sujets disponibles",
      value: stats.totalDocuments,
    },
    {
      icon: Download,
      label: "Téléchargements",
      value: stats.totalDownloads,
    },
    {
      icon: Users,
      label: "Contributeurs",
      value: stats.totalContributors,
    },
  ];

  return (
    <dl className="mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
      {items.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="bg-card flex flex-col items-center gap-2 rounded-xl border px-6 py-8 text-center shadow-sm"
        >
          <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <dd className="text-3xl font-bold tabular-nums">{formatNumber(value)}</dd>
          <dt className="text-muted-foreground text-sm">{label}</dt>
        </div>
      ))}
    </dl>
  );
}
