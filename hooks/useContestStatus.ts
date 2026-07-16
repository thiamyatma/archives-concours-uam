"use client";

import { useSyncExternalStore } from "react";
import type { ContestPhase, ContestSettings } from "@/lib/contest/types";
import {
  getContestPhase,
  getContestProgress,
  getRemainingTime,
  phaseHasCountdown,
  type RemainingTime,
} from "@/lib/contest/status";

export interface ContestStatus {
  currentPhase: ContestPhase;
  /** `null` avant hydratation (SSR) et quand il n'y a plus de décompte. */
  remainingTime: RemainingTime | null;
  /** Progression 0→1 inscriptions→concours, `null` avant hydratation. */
  progress: number | null;
}

/**
 * Horloge partagée exposée comme store externe : `useSyncExternalStore` gère
 * le SSR et évite tout `setState` dans un effet (pattern maison, voir
 * components/analytics/analytics.tsx). Snapshot = secondes epoch (référence
 * stable pendant une seconde).
 */
function subscribe(onChange: () => void): () => void {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

function getSnapshot(): number {
  return Math.floor(Date.now() / 1000);
}

const SERVER_SNAPSHOT = null;

function useNow(): Date | null {
  const seconds = useSyncExternalStore<number | null>(
    subscribe,
    getSnapshot,
    () => SERVER_SNAPSHOT
  );
  return seconds === null ? null : new Date(seconds * 1000);
}

/**
 * Concentre TOUTE la logique métier du statut du concours ; le composant qui
 * l'utilise n'a plus qu'à afficher. Piloté par les paramètres (dates) chargés
 * depuis la base.
 */
export function useContestStatus(settings: ContestSettings): ContestStatus {
  const now = useNow();
  // Phase calculée dès le rendu (serveur/client) : elle ne dépend pas des
  // sous-secondes. Seul le décompte est différé après hydratation.
  const currentPhase: ContestPhase = getContestPhase(now ?? new Date(), settings);
  const contest = settings.contestDate;

  return {
    currentPhase,
    remainingTime:
      now && contest && phaseHasCountdown(currentPhase)
        ? getRemainingTime(now, contest)
        : null,
    progress: now ? getContestProgress(now, settings) : null,
  };
}
