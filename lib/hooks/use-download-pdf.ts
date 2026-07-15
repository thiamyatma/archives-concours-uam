"use client";

import { useEffect, useState } from "react";
import {
  checkExamPdfAvailability,
  getExamPdfDownloadUrl,
} from "@/lib/actions/download-pdf";
import { useAnalytics } from "@/lib/hooks/use-analytics";
import { toast } from "sonner";

export type DownloadStatus =
  "checking" | "available" | "unavailable" | "downloading" | "error";

/**
 * Gère le cycle de vie complet du téléchargement d'un PDF d'épreuve :
 * vérification de disponibilité au montage (léger, sans générer d'URL),
 * puis génération d'URL signée + déclenchement du téléchargement au clic.
 * Réutilisable partout où un bouton de téléchargement PDF est nécessaire.
 */
export function useDownloadPdf(departementCode: string, annee: number) {
  const [status, setStatus] = useState<DownloadStatus>("checking");
  const { trackDownloadSubject } = useAnalytics();

  useEffect(() => {
    let cancelled = false;

    checkExamPdfAvailability(departementCode, annee).then(({ available }) => {
      if (!cancelled) setStatus(available ? "available" : "unavailable");
    });

    return () => {
      cancelled = true;
    };
  }, [departementCode, annee]);

  async function download() {
    setStatus("downloading");

    try {
      const result = await getExamPdfDownloadUrl(departementCode, annee);

      if ("error" in result) {
        // "error" (pas "unavailable") : un échec ponctuel (réseau, Storage)
        // reste réessayable, contrairement à "unavailable" qui signifie
        // "ce PDF n'existe vraiment pas" (vérifié au montage).
        setStatus("error");
        toast.error(result.error);
        return;
      }

      trackDownloadSubject({
        department: departementCode,
        year: annee,
        file_name: result.fileName,
      });
      window.location.href = result.url;
      toast.success("Le téléchargement a démarré.");
      setStatus("available");
    } catch {
      setStatus("error");
      toast.error("Le téléchargement a échoué. Réessayez.");
    }
  }

  return { status, download };
}
