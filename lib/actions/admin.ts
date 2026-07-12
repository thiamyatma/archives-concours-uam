"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { adminRejectSchema } from "@/lib/validations/document";
import {
  getAdminDocuments,
  type AdminDocumentQuery,
  type PaginatedDocuments,
} from "@/lib/data/documents";

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
): Promise<PaginatedDocuments> {
  await requireAdmin();
  return getAdminDocuments(filters);
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

export async function approveDocument(documentId: string): Promise<AdminActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase
      .from("documents")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", documentId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin");
    revalidatePath("/bibliotheque");
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
    const { error } = await supabase
      .from("documents")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        rejection_reason: parsed.data.reason,
      })
      .eq("id", documentId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin");
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
      .select("file_url")
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

    revalidatePath("/admin");
    revalidatePath("/bibliotheque");
    return { success: true };
  } catch {
    return { success: false, error: "Non autorisé." };
  }
}
