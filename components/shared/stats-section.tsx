import type { LucideIcon } from "lucide-react";
import { formatNumber } from "@/lib/format";

export interface StatItem {
  icon: LucideIcon;
  label: string;
  /** Un nombre est formaté avec le séparateur de milliers français ; une chaîne (ex. une année) s'affiche telle quelle. */
  value: number | string;
}

export function StatsSection({ items }: { items: StatItem[] }) {
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
          <dd className="text-3xl font-bold tabular-nums">
            {typeof value === "number" ? formatNumber(value) : value}
          </dd>
          <dt className="text-muted-foreground text-sm">{label}</dt>
        </div>
      ))}
    </dl>
  );
}
