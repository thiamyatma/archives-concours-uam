"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const SIGNED_URL_TTL_SECONDS = 60;

export interface DownloadResult {
  url?: string;
  error?: string;
}

/**
 * Génère une URL signée de courte durée pour un document approuvé et
 * incrémente son compteur de téléchargements de façon atomique.
 * Le bucket "documents" est privé : aucune URL publique n'existe en dehors
 * de celle-ci, générée côté serveur avec la clé service role.
 */
export async function getDownloadUrl(documentId: string): Promise<DownloadResult> {
  const supabase = await createClient();

  const { data: document, error } = await supabase
    .from("documents")
    .select("file_url, status")
    .eq("id", documentId)
    .maybeSingle();

  if (error || !document || document.status !== "approved") {
    return { error: "Document introuvable ou non disponible." };
  }

  const service = createServiceClient();

  const { data: signed, error: signedError } = await service.storage
    .from("documents")
    .createSignedUrl(document.file_url, SIGNED_URL_TTL_SECONDS, {
      download: true,
    });

  if (signedError || !signed) {
    return { error: "Impossible de générer le lien de téléchargement." };
  }

  const { error: rpcError } = await service.rpc("increment_document_downloads", {
    doc_id: documentId,
  });

  if (rpcError) {
    console.error("increment_document_downloads failed", rpcError);
  }

  return { url: signed.signedUrl };
}
