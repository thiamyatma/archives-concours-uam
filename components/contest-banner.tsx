import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BannerType, ContestBanner as ContestBannerData } from "@/lib/contest/types";

/**
 * Bannière d'annonce du concours (section 4). Sans directive : utilisable
 * côté serveur (page d'accueil) comme côté client (aperçu admin). Style dérivé
 * du `type` ; couleur d'accent optionnelle (hex) qui prime si renseignée.
 */
const TYPE_STYLES: Record<BannerType, { icon: LucideIcon; className: string }> = {
  info: {
    icon: Info,
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  success: {
    icon: CheckCircle2,
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  error: {
    icon: XCircle,
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

export function ContestBanner({ banner }: { banner: ContestBannerData }) {
  if (!banner.enabled) return null;
  if (!banner.title.trim() && !banner.message.trim()) return null;

  const style = TYPE_STYLES[banner.type];
  const Icon = style.icon;
  const hasCustomColor = /^#[0-9a-fA-F]{6}$/.test(banner.color);

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        !hasCustomColor && style.className
      )}
      style={
        hasCustomColor
          ? {
              color: banner.color,
              borderColor: `${banner.color}55`,
              backgroundColor: `${banner.color}1a`,
            }
          : undefined
      }
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {banner.title.trim() && <p className="font-semibold">{banner.title}</p>}
        {banner.message.trim() && (
          <p className={cn(banner.title.trim() && "text-foreground/80")}>
            {banner.message}
          </p>
        )}
      </div>
    </div>
  );
}
