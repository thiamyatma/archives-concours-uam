"use client";

import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDownloadPdf } from "@/lib/hooks/use-download-pdf";

/**
 * Bouton de téléchargement du PDF combiné d'une session d'examen. La
 * disponibilité (`available`) est résolue côté serveur au rendu de la page et
 * figée dans le HTML statique : plus de vérification au montage, donc aucune
 * requête déclenchée par une simple visite (voir docs/pdf-downloads.md).
 */
export function DownloadPdfButton({
  departementCode,
  annee,
  available,
  className,
}: {
  departementCode: string;
  annee: number;
  available: boolean;
  className?: string;
}) {
  const { status, download } = useDownloadPdf(departementCode, annee, available);
  const isBusy = status === "downloading";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      disabled={isBusy || status === "unavailable"}
      onClick={download}
    >
      {isBusy ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
      {status === "downloading"
        ? "Téléchargement…"
        : status === "error"
          ? "Réessayer"
          : "Télécharger le PDF"}
    </Button>
  );
}
