"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getDocumentPreviewUrl } from "@/lib/actions/download-pdf";

/**
 * Affiche le PDF directement dans la page (visionneuse native du
 * navigateur via `<iframe>`), pas juste un lien vers un nouvel onglet.
 * L'URL signée est récupérée côté client au montage (jamais au build ni
 * dans le Server Component de la page — voir docs/pdf-downloads.md) : la
 * page qui englobe ce composant reste statique/cachée, seul ce composant
 * fait un aller Supabase.
 */
export function PdfInlineViewer({
  departementCode,
  annee,
}: {
  departementCode: string;
  annee: number;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getDocumentPreviewUrl(departementCode, annee).then((result) => {
      if (cancelled) return;
      if ("error" in result) setError(result.error);
      else setUrl(result.url);
    });

    return () => {
      cancelled = true;
    };
  }, [departementCode, annee]);

  if (error) {
    return <p className="text-destructive text-center text-sm">{error}</p>;
  }

  if (!url) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Chargement du PDF…
      </div>
    );
  }

  return (
    <iframe
      src={url}
      title="Épreuve (PDF)"
      className="h-[80vh] w-full rounded-lg border"
    />
  );
}
