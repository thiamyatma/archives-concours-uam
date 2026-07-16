"use client";

import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CheckCircle2,
  FileText,
  Hourglass,
  Info,
  Megaphone,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTEST_CONFIG, type ContestConfig } from "@/config/contest";
import { useContestStatus } from "@/hooks/useContestStatus";
import type { ContestPhase, RemainingTime } from "@/lib/contest/status";

/**
 * Section "Concours" de la page d'accueil. Purement présentationnelle : toute
 * la logique (phase courante, temps restant, drapeaux) vient du hook
 * `useContestStatus`. Le message et le compte à rebours s'adaptent
 * automatiquement à la date courante.
 */
export function ContestCountdown({
  config = CONTEST_CONFIG,
}: {
  config?: ContestConfig;
}) {
  const { currentPhase, remainingTime } = useContestStatus(config);
  const message = getPhaseMessage(currentPhase, config);
  const Icon = message.icon;
  const showsCountdown = currentPhase === "registration" || currentPhase === "closed";

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-3 border-primary/20 from-primary/5 to-card gap-5 bg-gradient-to-b py-8 text-center duration-700">
      <CardHeader className="items-center gap-3">
        <span className="border-primary/20 bg-primary/10 text-primary inline-flex items-center gap-1.5 self-center rounded-full border px-3 py-1 text-xs font-semibold">
          <span
            className="bg-primary size-1.5 animate-pulse rounded-full"
            aria-hidden="true"
          />
          Concours {config.year}
        </span>
        <p
          role="status"
          aria-live="polite"
          className="mx-auto flex max-w-xl flex-col items-center gap-2 text-lg font-medium text-balance sm:flex-row sm:text-xl"
        >
          <Icon className="text-primary size-6 shrink-0" aria-hidden="true" />
          <span>
            <span aria-hidden="true">{message.emoji} </span>
            {message.text}
          </span>
        </p>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-6">
        {showsCountdown && (
          <Countdown remaining={remainingTime} target={config.contestDate} />
        )}

        <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg">
            <Link href="/departements">
              <FileText className="size-4" aria-hidden="true" />
              Consulter les anciennes épreuves
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/assistant">
              <Info className="size-4" aria-hidden="true" />
              Informations sur le concours
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
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
  target,
}: {
  remaining: RemainingTime | null;
  target: Date;
}) {
  const label = remaining
    ? `Temps restant jusqu'au concours : ${remaining.days} jours, ${remaining.hours} heures, ${remaining.minutes} minutes, ${remaining.seconds} secondes.`
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
        className="mx-auto grid max-w-md grid-cols-4 gap-2 sm:gap-3"
      >
        {COUNTDOWN_UNITS.map((unit) => (
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
    </div>
  );
}

function formatUnit(value: number, pad: boolean): string {
  return pad ? String(value).padStart(2, "0") : String(value);
}

interface PhaseMessage {
  emoji: string;
  icon: LucideIcon;
  text: string;
}

function getPhaseMessage(phase: ContestPhase, config: ContestConfig): PhaseMessage {
  const deadline = formatLong(config.registrationDeadline);
  const contestDate = formatLong(config.contestDate);

  switch (phase) {
    case "registration":
      return {
        emoji: "📢",
        icon: Megaphone,
        text: `Les inscriptions au concours sont ouvertes jusqu'au ${deadline}.`,
      };
    case "closed":
      return {
        emoji: "⏳",
        icon: Hourglass,
        text: `Les inscriptions sont terminées. Le concours aura lieu le ${contestDate}.`,
      };
    case "contest-day":
      return {
        emoji: "🎉",
        icon: PartyPopper,
        text: "Le concours a lieu aujourd'hui ! Bonne chance à tous les candidats.",
      };
    case "finished":
      return {
        emoji: "✅",
        icon: CheckCircle2,
        text: `Le concours est terminé. ${config.resultsMessage}`,
      };
  }
}

function formatLong(date: Date): string {
  return format(date, "d MMMM yyyy", { locale: fr });
}
