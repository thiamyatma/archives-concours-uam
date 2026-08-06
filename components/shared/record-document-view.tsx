"use client";

import { useEffect } from "react";
import { recordDocumentView } from "@/lib/actions/download-pdf";

/**
 * Délai d'engagement avant de compter la vue. Un crawler rend la page et
 * passe à la suivante ; un candidat qui ouvre une épreuve y reste. Le
 * comptage n'a donc lieu que si l'onglet est toujours monté ET visible après
 * ce délai. Heuristique, pas une garantie : elle écarte l'essentiel du
 * trafic automatisé sans jamais rejeter un lecteur réel (personne ne consulte
 * une épreuve en moins de 4 secondes).
 */
const ENGAGEMENT_DELAY_MS = 4000;

/**
 * Compte une consultation de page pour le dashboard admin ("Nombre de
 * consultations"). Composant sans rendu, parallèle à `TrackEpreuveView`
 * (qui envoie l'événement GA4) — les deux sont indépendants : celui-ci
 * alimente le compteur en base, pas Google Analytics.
 *
 * C'est la seule écriture qui subsiste sur le chemin d'une visite (une
 * écriture ne se cache pas). D'où les deux garde-fous : le délai ci-dessus
 * côté client, et un unique aller-retour côté serveur (RPC
 * `record_exam_document_view`, qui limite et enregistre dans la même
 * transaction). Voir docs/PERFORMANCE.md.
 */
export function RecordDocumentView({
  department,
  year,
}: {
  department: string;
  year: number;
}) {
  useEffect(() => {
    // Onglet ouvert en arrière-plan (préchargement, restauration de session) :
    // inutile d'armer le minuteur, la vue ne serait pas comptée.
    if (document.visibilityState !== "visible") return;

    const timer = setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      void recordDocumentView(department, year);
    }, ENGAGEMENT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [department, year]);

  return null;
}
