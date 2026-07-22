"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDocumentPreviewUrl } from "@/lib/actions/download-pdf";

type ViewerState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

/**
 * Affiche le PDF dans la page (visionneuse native du navigateur via
 * `<iframe>`), mais UNIQUEMENT après un clic explicite sur « Consulter le
 * PDF » — jamais au montage. Objectif : ne plus déclencher un
 * téléchargement complet du fichier à chaque affichage de page (bots,
 * simples chargements, rechargements), première cause d'egress Supabase.
 * L'URL signée est récupérée côté client au clic (la page englobante reste
 * statique/cachée) ; elle est mise en cache et partagée côté serveur (voir
 * lib/actions/download-pdf.ts) pour que le fichier bénéficie du cache
 * navigateur/CDN.
 */
export function PdfInlineViewer({
  departementCode,
  annee,
}: {
  departementCode: string;
  annee: number;
}) {
  const [state, setState] = useState<ViewerState>({ status: "idle" });

  async function consulter() {
    setState({ status: "loading" });
    const result = await getDocumentPreviewUrl(departementCode, annee);
    if ("error" in result) setState({ status: "error", message: result.error });
    else setState({ status: "ready", url: result.url });
  }

  if (state.status === "ready") {
    return (
      <iframe
        src={state.url}
        title="Épreuve (PDF)"
        className="h-[80vh] w-full rounded-lg border"
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-muted-foreground text-sm">
        Le PDF de cette épreuve s&apos;affiche à la demande.
      </p>
      <Button type="button" onClick={consulter} disabled={state.status === "loading"}>
        {state.status === "loading" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <FileText className="size-4" aria-hidden="true" />
        )}
        {state.status === "loading" ? "Chargement…" : "Consulter le PDF"}
      </Button>
      {state.status === "error" && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}
    </div>
  );
}
