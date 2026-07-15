"use client";

import { useEffect } from "react";
import { recordDocumentView } from "@/lib/actions/download-pdf";

/**
 * Compte une consultation de page pour le dashboard admin ("Nombre de
 * consultations"). Composant sans rendu, parallèle à `TrackEpreuveView`
 * (qui envoie l'événement GA4) — les deux sont indépendants : celui-ci
 * alimente le compteur en base, pas Google Analytics.
 */
export function RecordDocumentView({
  department,
  year,
}: {
  department: string;
  year: number;
}) {
  useEffect(() => {
    void recordDocumentView(department, year);
  }, [department, year]);

  return null;
}
