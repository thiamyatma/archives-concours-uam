"use client";

import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDownloadPdf } from "@/lib/hooks/use-download-pdf";

/**
 * Bouton de téléchargement du PDF combiné d'une session d'examen. Vérifie
 * la disponibilité au montage (côté client, via Server Action) : la page
 * qui l'englobe reste 100% statique, elle n'a jamais besoin de savoir si
 * un PDF existe (voir docs/pdf-downloads.md).
 */
export function DownloadPdfButton({
  departementCode,
  annee,
  className,
}: {
  departementCode: string;
  annee: number;
  className?: string;
}) {
  const { status, download } = useDownloadPdf(departementCode, annee);
  const isBusy = status === "checking" || status === "downloading";

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
      {status === "downloading" ? "Téléchargement…" : "Télécharger le PDF"}
    </Button>
  );
}
