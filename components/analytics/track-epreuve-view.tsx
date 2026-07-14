"use client";

import { useEffect } from "react";
import { trackViewSubject } from "@/lib/analytics/track";

/**
 * Émet l'événement `view_subject` (avec `department` / `year`) au montage de
 * la page d'une épreuve. Composant sans rendu, à placer dans la page
 * épreuve (Server Component). No-op si GA n'est pas chargé.
 */
export function TrackEpreuveView({
  department,
  year,
}: {
  department: string;
  year: number;
}) {
  useEffect(() => {
    trackViewSubject({ department, year });
  }, [department, year]);

  return null;
}
