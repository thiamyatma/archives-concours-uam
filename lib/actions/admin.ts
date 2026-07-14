"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { adminRejectSchema } from "@/lib/validations/document";
import { CACHE_TAGS } from "@/lib/data/cache-tags";
import { getAdminDocuments, type AdminDocumentQuery } from "@/lib/data/documents";
import { getContributors, type ContributorQuery } from "@/lib/data/contributors";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non autorisé.");
  }

  return supabase;
}

export interface AdminActionResult {
  success: boolean;
  error?: string;
}

/** Utilisé par le tableau admin côté client (React Query) pour charger les documents. */
export async function fetchAdminDocuments(
  filters: AdminDocumentQuery
): Promise<Awaited<ReturnType<typeof getAdminDocuments>>> {
  await requireAdmin();
  return getAdminDocuments(filters);
}

/** Utilisé par la liste admin des contributeurs (React Query). */
export async function fetchContributors(
  filters: ContributorQuery
): Promise<Awaited<ReturnType<typeof getContributors>>> {
  await requireAdmin();
  return getContributors(filters);
}

const PREVIEW_URL_TTL_SECONDS = 120;

/** Aperçu PDF admin : signé même pour un document pending/rejected. */
export async function getAdminPreviewUrl(
  documentId: string
): Promise<{ url?: string; error?: string }> {
  try {
    const supabase = await requireAdmin();
    const { data: document, error } = await supabase
      .from("documents")
      .select("file_url")
      .eq("id", documentId)
      .maybeSingle();

    if (error || !document) {
      return { error: "Document introuvable." };
    }

    const service = createServiceClient();
    const { data: signed, error: signedError } = await service.storage
      .from("documents")
      .createSignedUrl(document.file_url, PREVIEW_URL_TTL_SECONDS);

    if (signedError || !signed) {
      return { error: "Impossible de générer l'aperçu." };
    }

    return { url: signed.signedUrl };
  } catch {
    return { error: "Non autorisé." };
  }
}

/**
 * Invalide précisément les pages publiques concernées par un document
 * (plutôt qu'un `revalidatePath("/bibliotheque")` seul) + les caches
 * globaux (stats, comptage par filière) tagués `unstable_cache` — voir
 * docs/PERFORMANCE.md. Sans ça, `/filieres/[code]` et `/filieres/[code]/
 * [annee]` resteraient périmés jusqu'à l'expiration de leur `revalidate`
 * (jusqu'à quelques minutes) après une validation/refus/suppression.
 */
function revalidateDocumentSurfaces(filiereCode: string | null, annee: number | null) {
  revalidatePath("/admin");
  revalidatePath("/bibliotheque");
  revalidatePath("/");
  revalidateTag(CACHE_TAGS.globalStats);
  revalidateTag(CACHE_TAGS.filieres);
  revalidateTag(CACHE_TAGS.documents);

  if (filiereCode) {
    revalidatePath(`/filieres/${filiereCode}`);
    if (annee) revalidatePath(`/filieres/${filiereCode}/${annee}`);
  }
}

export async function approveDocument(documentId: string): Promise<AdminActionResult> {
  try {
    const supabase = await requireAdmin();
    const { data, error } = await supabase
      .from("documents")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", documentId)
      .select("annee, filieres ( code )")
      .single();

    if (error) return { success: false, error: error.message };

    const filiereCode = (data?.filieres as { code: string } | null)?.code ?? null;
    revalidateDocumentSurfaces(filiereCode, data?.annee ?? null);
    return { success: true };
  } catch {
    return { success: false, error: "Non autorisé." };
  }
}

export async function rejectDocument(
  documentId: string,
  reason: string
): Promise<AdminActionResult> {
  const parsed = adminRejectSchema.safeParse({ documentId, reason });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Motif invalide.",
    };
  }

  try {
    const supabase = await requireAdmin();
    const { data, error } = await supabase
      .from("documents")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        rejection_reason: parsed.data.reason,
      })
      .eq("id", documentId)
      .select("annee, filieres ( code )")
      .single();

    if (error) return { success: false, error: error.message };

    // Refuser un document déjà approuvé (cas rare mais permis côté UI) le
    // retire aussi des surfaces publiques : on invalide de la même façon.
    const filiereCode = (data?.filieres as { code: string } | null)?.code ?? null;
    revalidateDocumentSurfaces(filiereCode, data?.annee ?? null);
    return { success: true };
  } catch {
    return { success: false, error: "Non autorisé." };
  }
}

export async function deleteDocument(documentId: string): Promise<AdminActionResult> {
  try {
    const supabase = await requireAdmin();

    const { data: document, error: fetchError } = await supabase
      .from("documents")
      .select("file_url, annee, filieres ( code )")
      .eq("id", documentId)
      .maybeSingle();

    if (fetchError || !document) {
      return { success: false, error: "Document introuvable." };
    }

    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId);

    if (deleteError) return { success: false, error: deleteError.message };

    await supabase.storage.from("documents").remove([document.file_url]);

    const filiereCode = (document.filieres as { code: string } | null)?.code ?? null;
    revalidateDocumentSurfaces(filiereCode, document.annee);
    return { success: true };
  } catch {
    return { success: false, error: "Non autorisé." };
  }
}
