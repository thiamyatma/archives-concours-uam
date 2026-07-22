"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminSession } from "@/lib/actions/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getDepartementByCode } from "@/lib/departements";
import { buildDocumentStoragePath } from "@/lib/pdf/slugify";
import {
  EXAM_PREVIEW_CACHE_TAG,
  MAX_PDF_SIZE_BYTES,
  PDF_BUCKET,
} from "@/lib/pdf/constants";
import { formatFileSize } from "@/lib/format";
import { env } from "@/lib/env";

const ADMIN_PAGE_PATH = "/admin/epreuves";

/**
 * Après toute mutation d'un document, rafraîchit la page d'admin ET invalide
 * le cache des URL signées d'aperçu (voir lib/actions/download-pdf.ts) : sans
 * ça, un aperçu pourrait rester en cache vers un fichier déplacé/supprimé/
 * dépublié. Tag global (pas par épreuve) : volume de mutations admin
 * négligeable, la simplicité prime.
 */
function revalidateAfterDocumentChange(): void {
  revalidatePath(ADMIN_PAGE_PATH);
  revalidateTag(EXAM_PREVIEW_CACHE_TAG);
}

const departementCodesSchema = z.array(z.string().min(1)).min(1);
const anneeSchema = z.number().int().min(2000).max(2100);
const statutSchema = z.enum(["publie", "brouillon"]);

function unknownDepartements(codes: string[]): string[] {
  return codes.filter((code) => !getDepartementByCode(code));
}

/** Lit les 5 premiers octets d'un objet Storage pour vérifier `%PDF-`. */
async function isRealPdf(path: string): Promise<boolean> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return false;

  // `cache: "no-store"` : sans ça, le patch `fetch` de Next.js (Data Cache)
  // peut tenter de mettre en cache/cloner une réponse dont on ne lit qu'un
  // extrait via un reader manuel — observé en production comme un blocage
  // silencieux de toute la Server Action. `AbortController` en filet de
  // sécurité supplémentaire pour ne jamais bloquer confirmUpload indéfiniment.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${PDF_BUCKET}/${path}`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          Range: "bytes=0-4",
        },
        cache: "no-store",
        signal: controller.signal,
      }
    );
    if (!response.ok || !response.body) return false;

    const reader = response.body.getReader();
    const { value } = await reader.read();
    await reader.cancel();
    if (!value || value.length < 5) return false;

    return new TextDecoder().decode(value.slice(0, 5)) === "%PDF-";
  } catch (error) {
    console.error("isRealPdf a échoué:", path, error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/** Départements déjà liés à un AUTRE document pour cette année (doublon). */
async function findConflictingDepartements(
  supabase: ReturnType<typeof createServiceClient>,
  departementCodes: string[],
  annee: number,
  excludeDocumentId?: string
): Promise<string[]> {
  const { data } = await supabase
    .from("exam_document_departments")
    .select("departement_code, document_id")
    .eq("annee", annee)
    .in("departement_code", departementCodes);

  return (data ?? [])
    .filter((row) => row.document_id !== excludeDocumentId)
    .map((row) => row.departement_code);
}

const createUploadUrlSchema = z.object({
  departementCodes: departementCodesSchema,
  annee: anneeSchema,
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  replaceDocumentId: z.string().uuid().optional(),
});

export type CreateUploadUrlInput = z.infer<typeof createUploadUrlSchema>;
export type CreateUploadUrlResult =
  { signedUrl: string; path: string } | { error: string };

export async function createUploadUrl(
  input: CreateUploadUrlInput
): Promise<CreateUploadUrlResult> {
  await requireAdminSession();

  const parsed = createUploadUrlSchema.safeParse(input);
  if (!parsed.success) return { error: "Requête invalide." };
  const { departementCodes, annee, fileName, fileSize, replaceDocumentId } = parsed.data;

  const unknown = unknownDepartements(departementCodes);
  if (unknown.length > 0) {
    return { error: `Département(s) inconnu(s) : ${unknown.join(", ")}.` };
  }

  if (fileSize > MAX_PDF_SIZE_BYTES) {
    return {
      error: `Fichier trop volumineux (max ${formatFileSize(MAX_PDF_SIZE_BYTES)}).`,
    };
  }

  const supabase = createServiceClient();

  const conflicts = await findConflictingDepartements(
    supabase,
    departementCodes,
    annee,
    replaceDocumentId
  );
  if (conflicts.length > 0) {
    return {
      error: `Un document existe déjà pour ${conflicts.join(", ")} en ${annee}.`,
    };
  }

  const path = buildDocumentStoragePath(departementCodes, annee, fileName);
  // `upsert: true` même pour un nouvel envoi (pas seulement un remplacement) :
  // le doublon département+année est déjà bloqué juste au-dessus, donc un
  // objet existant à ce chemin exact ne peut être qu'un résidu orphelin
  // d'une tentative précédente interrompue avant confirmUpload — sans
  // upsert, Storage renvoie "The resource already exists" et bloque tout
  // nouvel essai du même fichier.
  const { data, error } = await supabase.storage
    .from(PDF_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data) {
    console.error("createSignedUploadUrl a échoué:", path, error?.message, error);
    return { error: "Impossible de préparer l'upload." };
  }

  return { signedUrl: data.signedUrl, path: data.path };
}

const confirmUploadSchema = z.object({
  departementCodes: departementCodesSchema,
  annee: anneeSchema,
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  description: z.string().optional(),
  statut: statutSchema,
  storagePath: z.string().min(1),
  replaceDocumentId: z.string().uuid().optional(),
});

export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
export type ConfirmUploadResult = { success: true; id: string } | { error: string };

export async function confirmUpload(
  input: ConfirmUploadInput
): Promise<ConfirmUploadResult> {
  await requireAdminSession();

  const parsed = confirmUploadSchema.safeParse(input);
  if (!parsed.success) return { error: "Requête invalide." };
  const {
    departementCodes,
    annee,
    fileName,
    fileSize,
    description,
    statut,
    storagePath,
    replaceDocumentId,
  } = parsed.data;

  const supabase = createServiceClient();

  if (!(await isRealPdf(storagePath))) {
    await supabase.storage.from(PDF_BUCKET).remove([storagePath]);
    return { error: "Le fichier envoyé n'est pas un PDF valide." };
  }

  if (replaceDocumentId) {
    const { data: existing } = await supabase
      .from("exam_documents")
      .select("storage_path")
      .eq("id", replaceDocumentId)
      .maybeSingle();

    if (!existing) {
      await supabase.storage.from(PDF_BUCKET).remove([storagePath]);
      return { error: "Document introuvable." };
    }

    const { error: updateError } = await supabase
      .from("exam_documents")
      .update({
        file_name: fileName,
        storage_path: storagePath,
        file_size: fileSize,
        description: description || null,
        statut,
      })
      .eq("id", replaceDocumentId);

    if (updateError) {
      await supabase.storage.from(PDF_BUCKET).remove([storagePath]);
      return { error: "Échec de l'enregistrement." };
    }

    if (existing.storage_path !== storagePath) {
      await supabase.storage.from(PDF_BUCKET).remove([existing.storage_path]);
    }

    revalidateAfterDocumentChange();
    return { success: true, id: replaceDocumentId };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("exam_documents")
    .insert({
      annee,
      file_name: fileName,
      storage_path: storagePath,
      file_size: fileSize,
      description: description || null,
      statut,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    await supabase.storage.from(PDF_BUCKET).remove([storagePath]);
    return { error: "Échec de l'enregistrement." };
  }

  const { error: linkError } = await supabase.from("exam_document_departments").insert(
    departementCodes.map((code) => ({
      document_id: inserted.id,
      departement_code: code,
      annee,
    }))
  );

  if (linkError) {
    await supabase.from("exam_documents").delete().eq("id", inserted.id);
    await supabase.storage.from(PDF_BUCKET).remove([storagePath]);
    const isDuplicate = linkError.code === "23505";
    return {
      error: isDuplicate
        ? "Un document existe déjà pour un des départements sélectionnés en cette année (conflit détecté à l'enregistrement)."
        : "Échec de l'enregistrement.",
    };
  }

  revalidateAfterDocumentChange();
  return { success: true, id: inserted.id };
}

const updateMetadataSchema = z.object({
  id: z.string().uuid(),
  departementCodes: departementCodesSchema,
  annee: anneeSchema,
  description: z.string().optional(),
  statut: statutSchema,
});

export type UpdateDocumentMetadataInput = z.infer<typeof updateMetadataSchema>;

export async function updateDocumentMetadata(
  input: UpdateDocumentMetadataInput
): Promise<{ success: true } | { error: string }> {
  await requireAdminSession();

  const parsed = updateMetadataSchema.safeParse(input);
  if (!parsed.success) return { error: "Requête invalide." };
  const { id, departementCodes, annee, description, statut } = parsed.data;

  const unknown = unknownDepartements(departementCodes);
  if (unknown.length > 0) {
    return { error: `Département(s) inconnu(s) : ${unknown.join(", ")}.` };
  }

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("exam_documents")
    .select("storage_path, file_name")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Document introuvable." };

  const conflicts = await findConflictingDepartements(
    supabase,
    departementCodes,
    annee,
    id
  );
  if (conflicts.length > 0) {
    return { error: `Un document existe déjà pour ${conflicts.join(", ")} en ${annee}.` };
  }

  const newPath = buildDocumentStoragePath(departementCodes, annee, existing.file_name);
  if (newPath !== existing.storage_path) {
    const { error: moveError } = await supabase.storage
      .from(PDF_BUCKET)
      .move(existing.storage_path, newPath);
    if (moveError) return { error: "Échec du déplacement du fichier." };
  }

  const { error: updateError } = await supabase
    .from("exam_documents")
    .update({ annee, description: description || null, statut, storage_path: newPath })
    .eq("id", id);
  if (updateError) return { error: "Échec de la mise à jour." };

  await supabase.from("exam_document_departments").delete().eq("document_id", id);
  const { error: linkError } = await supabase
    .from("exam_document_departments")
    .insert(
      departementCodes.map((code) => ({ document_id: id, departement_code: code, annee }))
    );
  if (linkError) {
    const isDuplicate = linkError.code === "23505";
    return {
      error: isDuplicate
        ? "Un des départements sélectionnés est déjà lié à un autre document pour cette année."
        : "Échec de la mise à jour des départements liés.",
    };
  }

  revalidateAfterDocumentChange();
  return { success: true };
}

const toggleStatusSchema = z.object({ id: z.string().uuid(), statut: statutSchema });

export async function toggleDocumentStatus(
  input: z.infer<typeof toggleStatusSchema>
): Promise<{ success: true } | { error: string }> {
  await requireAdminSession();

  const parsed = toggleStatusSchema.safeParse(input);
  if (!parsed.success) return { error: "Requête invalide." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("exam_documents")
    .update({ statut: parsed.data.statut })
    .eq("id", parsed.data.id);
  if (error) return { error: "Échec de la mise à jour du statut." };

  revalidateAfterDocumentChange();
  return { success: true };
}

const deleteDocumentSchema = z.object({ id: z.string().uuid() });

export async function deleteDocument(
  input: z.infer<typeof deleteDocumentSchema>
): Promise<{ success: true } | { error: string }> {
  await requireAdminSession();

  const parsed = deleteDocumentSchema.safeParse(input);
  if (!parsed.success) return { error: "Requête invalide." };

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("exam_documents")
    .select("storage_path")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!existing) return { error: "Document introuvable." };

  const { error: deleteError } = await supabase
    .from("exam_documents")
    .delete()
    .eq("id", parsed.data.id);
  if (deleteError) return { error: "Échec de la suppression." };

  // Best-effort : un objet Storage orphelin est un problème mineur
  // (nettoyable plus tard), contrairement à un enregistrement qui
  // pointerait vers un fichier déjà supprimé.
  const { error: storageError } = await supabase.storage
    .from(PDF_BUCKET)
    .remove([existing.storage_path]);
  if (storageError) {
    console.error(
      "Suppression de l'objet Storage échouée (orphelin):",
      storageError.message
    );
  }

  revalidateAfterDocumentChange();
  return { success: true };
}
