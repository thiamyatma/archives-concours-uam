"use client";

import { useState } from "react";
import { getExamPdfDownloadUrl } from "@/lib/actions/download-pdf";
import { useAnalytics } from "@/lib/hooks/use-analytics";
import { toast } from "sonner";

export type DownloadStatus = "available" | "unavailable" | "downloading" | "error";

/**
 * Gère le téléchargement d'un PDF d'épreuve : génération de l'URL signée +
 * déclenchement du téléchargement, **au clic uniquement**. La disponibilité
 * n'est plus vérifiée au montage — elle est résolue côté serveur au rendu de
 * la page (cachée et invalidée par tag, voir lib/data/exam-documents.ts) et
 * passée en prop, pour qu'une simple visite ne coûte plus ni invocation
 * serverless ni requête Supabase.
 */
export function useDownloadPdf(
  departementCode: string,
  annee: number,
  available: boolean
) {
  const [status, setStatus] = useState<DownloadStatus>(
    available ? "available" : "unavailable"
  );
  const { trackDownloadSubject } = useAnalytics();

  async function download() {
    setStatus("downloading");

    try {
      const result = await getExamPdfDownloadUrl(departementCode, annee);

      if ("error" in result) {
        // "error" (pas "unavailable") : un échec ponctuel (réseau, Storage)
        // reste réessayable, contrairement à "unavailable" qui signifie
        // "ce PDF n'existe vraiment pas" (résolu au rendu de la page).
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
