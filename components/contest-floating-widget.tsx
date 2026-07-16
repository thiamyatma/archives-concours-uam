"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContestStatus } from "@/hooks/useContestStatus";
import { phaseHasCountdown } from "@/lib/contest/status";
import type { ContestSettings } from "@/lib/contest/types";

/**
 * Pilule flottante du compte à rebours, visible sur tout le site (montée
 * dans app/layout.tsx). Masquée sur la page d'accueil elle-même (déjà la
 * carte complète), et dès qu'il n'y a plus de décompte à afficher.
 */
export function ContestFloatingWidget({ settings }: { settings: ContestSettings }) {
  const pathname = usePathname();
  const { currentPhase, remainingTime } = useContestStatus(settings);

  const isHome = pathname === "/";
  const shouldShow =
    !isHome &&
    settings.countdown.enabled &&
    settings.countdown.floatingWidget &&
    phaseHasCountdown(currentPhase) &&
    remainingTime !== null;

  if (!shouldShow || !remainingTime) return null;

  const isRight = settings.countdown.position !== "left";

  return (
    <Link
      href="/"
      className={cn(
        "bg-card text-foreground fixed z-40 flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium shadow-lg transition-transform hover:scale-105",
        // Le widget de chat (components/chat/chat-widget.tsx) occupe déjà le
        // coin bas-droit (`right-6 bottom-6`, size-14 + son panneau ouvert
        // jusqu'à `bottom-24`) : on se place au-dessus pour ne jamais le
        // recouvrir. Le côté gauche n'a aucun autre widget flottant.
        isRight ? "right-4 bottom-24 sm:right-6" : "bottom-4 left-4"
      )}
    >
      <CalendarClock className="text-primary size-4" aria-hidden="true" />
      <span className="tabular-nums">
        {remainingTime.days}j {String(remainingTime.hours).padStart(2, "0")}h
      </span>
      <span className="text-muted-foreground hidden sm:inline">avant le concours</span>
    </Link>
  );
}
