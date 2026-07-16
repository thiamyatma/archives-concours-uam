"use client";

import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Award,
  CalendarClock,
  CheckCircle2,
  Hourglass,
  Megaphone,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ContestInfoDialog } from "@/components/contest-info-dialog";
import { useContestStatus } from "@/hooks/useContestStatus";
import { messageForPhase } from "@/lib/contest/messages";
import type { ContestPhase, ContestSettings } from "@/lib/contest/types";
import type { RemainingTime } from "@/lib/contest/status";

/**
 * Section « Concours » de la page d'accueil, entièrement pilotée par les
 * paramètres chargés depuis la base (`ContestSettings`). Présentationnelle :
 * la logique (phase, temps restant, progression) vient de `useContestStatus`.
 * Réutilisée telle quelle dans l'aperçu en direct de l'admin.
 */
const PHASE_ICON: Record<ContestPhase, LucideIcon> = {
  before_registration: CalendarClock,
  registration_open: Megaphone,
  registration_closed: Hourglass,
  contest_day: PartyPopper,
  after_contest: CheckCircle2,
  results_published: Award,
};

export function ContestCountdown({ settings }: { settings: ContestSettings }) {
  const { currentPhase, remainingTime, progress } = useContestStatus(settings);
  const Icon = PHASE_ICON[currentPhase];
  const message = messageForPhase(currentPhase, settings);
  const showsCountdown =
    settings.countdown.enabled &&
    (currentPhase === "before_registration" ||
      currentPhase === "registration_open" ||
      currentPhase === "registration_closed");

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-3 border-primary/20 from-primary/5 to-card @container gap-5 overflow-hidden bg-gradient-to-b py-8 text-center duration-700">
      <CardHeader className="items-center gap-3">
        <span className="border-primary/20 bg-primary/10 text-primary inline-flex items-center gap-1.5 self-center rounded-full border px-3 py-1 text-xs font-semibold">
          <span
            className="bg-primary size-1.5 animate-pulse rounded-full"
            aria-hidden="true"
          />
          {settings.officialName}
        </span>
        <p
          role="status"
          aria-live="polite"
          className="mx-auto flex max-w-xl flex-col items-center gap-2 text-lg font-medium text-balance sm:text-xl @sm:flex-row"
        >
          <Icon className="text-primary size-6 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </p>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-6">
        {showsCountdown && settings.contestDate && (
          <Countdown
            remaining={remainingTime}
            progress={settings.countdown.showProgress ? progress : null}
            showSeconds={settings.countdown.showSeconds}
            target={settings.contestDate}
          />
        )}

        <div className="flex w-full flex-col justify-center gap-3 @sm:w-auto @sm:flex-row">
          <ContestLinkButton
            label={settings.buttons.primaryLabel}
            url={settings.buttons.primaryUrl}
          />
          <ContestLinkButton
            label={settings.buttons.secondaryLabel}
            url={settings.buttons.secondaryUrl}
            variant="outline"
          />
        </div>

        <ContestInfoDialog info={settings.info} />
      </CardContent>
    </Card>
  );
}

function ContestLinkButton({
  label,
  url,
  variant = "default",
}: {
  label: string;
  url: string;
  variant?: "default" | "outline";
}) {
  if (!label.trim() || !url.trim()) return null;
  const isInternal = url.startsWith("/");

  return (
    <Button asChild size="lg" variant={variant}>
      {isInternal ? (
        <Link href={url}>{label}</Link>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      )}
    </Button>
  );
}

const COUNTDOWN_UNITS = [
  { key: "days", label: "Jours", pad: false },
  { key: "hours", label: "Heures", pad: true },
  { key: "minutes", label: "Minutes", pad: true },
  { key: "seconds", label: "Secondes", pad: true },
] as const;

function Countdown({
  remaining,
  progress,
  showSeconds,
  target,
}: {
  remaining: RemainingTime | null;
  progress: number | null;
  showSeconds: boolean;
  target: Date;
}) {
  const units = showSeconds
    ? COUNTDOWN_UNITS
    : COUNTDOWN_UNITS.filter((unit) => unit.key !== "seconds");

  const label = remaining
    ? `Temps restant jusqu'au concours : ${remaining.days} jours, ${remaining.hours} heures, ${remaining.minutes} minutes${showSeconds ? `, ${remaining.seconds} secondes` : ""}.`
    : "Chargement du compte à rebours.";

  return (
    <div className="w-full">
      <p className="text-muted-foreground mb-3 text-sm">
        Compte à rebours jusqu&apos;au{" "}
        <time dateTime={target.toISOString()} className="text-foreground font-medium">
          {format(target, "d MMMM yyyy", { locale: fr })}
        </time>
      </p>
      <div
        role="timer"
        aria-label={label}
        className="mx-auto grid max-w-md gap-2 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${units.length}, minmax(0, 1fr))` }}
      >
        {units.map((unit) => (
          <div
            key={unit.key}
            aria-hidden="true"
            className="bg-card flex flex-col items-center gap-1 rounded-xl border px-2 py-3 shadow-sm sm:py-4"
          >
            {remaining ? (
              <span className="text-primary text-2xl font-bold tabular-nums sm:text-4xl">
                {formatUnit(remaining[unit.key], unit.pad)}
              </span>
            ) : (
              <Skeleton className="h-8 w-10 sm:h-10 sm:w-14" />
            )}
            <span className="text-muted-foreground text-[0.65rem] font-medium tracking-wide uppercase sm:text-xs">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
      {progress !== null && (
        <Progress
          value={Math.round(progress * 100)}
          className="mx-auto mt-4 max-w-md"
          aria-label="Progression jusqu'au concours"
        />
      )}
    </div>
  );
}

function formatUnit(value: number, pad: boolean): string {
  return pad ? String(value).padStart(2, "0") : String(value);
}
