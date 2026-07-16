"use client";

import { useSyncExternalStore } from "react";
import { CONTEST_CONFIG, type ContestConfig } from "@/config/contest";
import {
  getContestPhase,
  getRemainingTime,
  type ContestPhase,
  type RemainingTime,
} from "@/lib/contest/status";

export interface ContestStatus {
  currentPhase: ContestPhase;
  /**
   * Temps restant jusqu'au concours. `null` tant que le composant n'est pas
   * hydraté (le SSR ne connaît pas l'heure du client) et dès qu'il n'y a plus
   * de décompte à afficher (jour J et après).
   */
  remainingTime: RemainingTime | null;
  registrationOpen: boolean;
  contestStarted: boolean;
  contestFinished: boolean;
}

/**
 * Horloge partagée exposée comme un store externe : `useSyncExternalStore`
 * gère proprement le SSR et évite tout `setState` dans un effet (même pattern
 * que `components/analytics/analytics.tsx`). Le snapshot est un nombre de
 * secondes (référence stable pendant une seconde, requis par l'API).
 */
function subscribe(onChange: () => void): () => void {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

function getSnapshot(): number {
  return Math.floor(Date.now() / 1000);
}

// Snapshot serveur constant (`null`) : le SSR et le premier rendu client
// (hydratation) affichent le décompte en squelette, sans divergence.
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
 * Concentre TOUTE la logique métier du décompte : le composant qui l'utilise
 * n'a plus qu'à afficher. Rafraîchit chaque seconde. La configuration est
 * injectable (défaut : `CONTEST_CONFIG`) pour préparer une future source
 * Supabase passée en prop depuis un Server Component.
 */
export function useContestStatus(config: ContestConfig = CONTEST_CONFIG): ContestStatus {
  const now = useNow();
  // Avant l'hydratation, la phase est calculée à partir de l'heure de rendu
  // (serveur puis client) : elle ne change qu'à 4 instants dans l'année, donc
  // aucune divergence visible. Seul le décompte (secondes) est différé.
  const currentPhase = getContestPhase(now ?? new Date(), config);
  const showCountdown = currentPhase === "registration" || currentPhase === "closed";

  return {
    currentPhase,
    remainingTime:
      now && showCountdown ? getRemainingTime(now, config.contestDate) : null,
    registrationOpen: currentPhase === "registration",
    contestStarted: currentPhase === "contest-day",
    contestFinished: currentPhase === "finished",
  };
}
