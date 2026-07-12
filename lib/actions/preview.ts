"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const PREVIEW_URL_TTL_SECONDS = 120;

export interface PreviewResult {
  url?: string;
  error?: string;
}

/**
 * URL signée de courte durée pour prévisualiser un document déjà approuvé.
 * Contrairement au téléchargement, n'incrémente pas le compteur `downloads`.
 */
export async function getPreviewUrl(documentId: string): Promise<PreviewResult> {
  const supabase = await createClient();

  const { data: document, error } = await supabase
    .from("documents")
    .select("file_url, status")
    .eq("id", documentId)
    .maybeSingle();

  if (error || !document || document.status !== "approved") {
    return { error: "Aperçu indisponible pour ce document." };
  }

  const service = createServiceClient();
  const { data: signed, error: signedError } = await service.storage
    .from("documents")
    .createSignedUrl(document.file_url, PREVIEW_URL_TTL_SECONDS);

  if (signedError || !signed) {
    return { error: "Impossible de générer l'aperçu." };
  }

  return { url: signed.signedUrl };
}
