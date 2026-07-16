import { endOfDay, startOfDay } from "date-fns";
import type { ContestPhase, ContestSettings } from "@/lib/contest/types";

/**
 * Logique métier pure du statut du concours (aucune dépendance React, `now`
 * toujours injecté). Machine à états à partir des 4 dates configurables ; les
 * dates peuvent être nulles (repli gracieux). Isolée ici pour être testable
 * et réutilisable serveur/client.
 */

export interface RemainingTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Millisecondes restantes (0 si la cible est atteinte). */
  total: number;
}

/**
 * Détermine la phase du concours à l'instant `now` :
 * - `before_registration` : avant l'ouverture des inscriptions ;
 * - `registration_open` : inscriptions ouvertes ;
 * - `registration_closed` : inscriptions fermées, avant le jour du concours ;
 * - `contest_day` : le jour même du concours (toute la journée) ;
 * - `after_contest` : après le concours, avant la date des résultats ;
 * - `results_published` : à partir de la date des résultats.
 */
export function getContestPhase(now: Date, settings: ContestSettings): ContestPhase {
  const nowMs = now.getTime();
  const opens = settings.registrationOpensAt?.getTime();
  const closes = settings.registrationClosesAt?.getTime();
  const contest = settings.contestDate;
  const results = settings.resultsDate?.getTime();

  if (opens !== undefined && nowMs < opens) return "before_registration";
  if (closes !== undefined && nowMs <= closes) return "registration_open";

  if (contest) {
    if (nowMs < startOfDay(contest).getTime()) return "registration_closed";
    if (nowMs <= endOfDay(contest).getTime()) return "contest_day";
    if (results !== undefined && nowMs >= results) return "results_published";
    return "after_contest";
  }

  // Pas de date de concours définie : on reste au stade des inscriptions.
  if (closes !== undefined && nowMs > closes) return "registration_closed";
  return "registration_open";
}

/** Le compte à rebours (vers le concours) n'a de sens qu'avant le jour J. */
export function phaseHasCountdown(phase: ContestPhase): boolean {
  return (
    phase === "before_registration" ||
    phase === "registration_open" ||
    phase === "registration_closed"
  );
}

/** Décompose le temps restant jusqu'à `target` (jamais négatif). */
export function getRemainingTime(now: Date, target: Date): RemainingTime {
  const total = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(total / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    total,
  };
}

/**
 * Progression 0→1 entre l'ouverture des inscriptions et le concours (pour la
 * barre de progression optionnelle). `null` si les deux dates ne sont pas
 * disponibles.
 */
export function getContestProgress(now: Date, settings: ContestSettings): number | null {
  const start = settings.registrationOpensAt?.getTime();
  const end = settings.contestDate?.getTime();
  if (start === undefined || end === undefined || end <= start) return null;

  const ratio = (now.getTime() - start) / (end - start);
  return Math.min(1, Math.max(0, ratio));
}
