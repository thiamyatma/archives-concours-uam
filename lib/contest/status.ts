import { endOfDay, startOfDay } from "date-fns";
import type { ContestConfig } from "@/config/contest";

/**
 * Logique métier pure du statut du concours (aucune dépendance React, aucun
 * accès au temps courant en interne : `now` est toujours injecté). Isolée ici
 * pour être testable unitairement et réutilisable côté serveur comme côté
 * client. Le hook `useContestStatus` n'est qu'une fine enveloppe qui fournit
 * le `now` courant et déclenche le rafraîchissement.
 */

export type ContestPhase = "registration" | "closed" | "contest-day" | "finished";

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
 * - `registration` : jusqu'à la date limite d'inscription (incluse) ;
 * - `closed` : inscriptions terminées, avant le jour du concours ;
 * - `contest-day` : le jour même du concours (toute la journée) ;
 * - `finished` : après le jour du concours.
 */
export function getContestPhase(now: Date, config: ContestConfig): ContestPhase {
  const nowMs = now.getTime();

  if (nowMs <= config.registrationDeadline.getTime()) return "registration";
  if (nowMs < startOfDay(config.contestDate).getTime()) return "closed";
  if (nowMs <= endOfDay(config.contestDate).getTime()) return "contest-day";
  return "finished";
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
