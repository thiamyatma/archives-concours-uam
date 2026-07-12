"use server";

import { createClient } from "@/lib/supabase/server";
import { contributionServerSchema } from "@/lib/validations/document";
import { notifyAdminNewContribution } from "@/lib/email";

export interface ContributeState {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

function slugifyFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .replace(/[^a-zA-Z0-9.]+/g, "-")
    .toLowerCase();
}

export async function submitDocument(
  _prevState: ContributeState,
  formData: FormData
): Promise<ContributeState> {
  const raw = {
    filiereId: formData.get("filiereId"),
    annee: formData.get("annee"),
    matiere: formData.get("matiere"),
    type: formData.get("type"),
    description: formData.get("description") ?? "",
    contributorName: formData.get("contributorName") ?? "",
    contributorEmail: formData.get("contributorEmail") ?? "",
    file: formData.get("file"),
  };

  const parsed = contributionServerSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: "Le formulaire contient des erreurs.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    filiereId,
    annee,
    matiere,
    type,
    description,
    contributorName,
    contributorEmail,
    file,
  } = parsed.data;

  const supabase = await createClient();

  const { data: filiere, error: filiereError } = await supabase
    .from("filieres")
    .select("code, nom")
    .eq("id", filiereId)
    .maybeSingle();

  if (filiereError || !filiere) {
    return { success: false, error: "Filière introuvable." };
  }

  let uploadedBy: string | null = null;
  if (contributorName || contributorEmail) {
    const { data: contributor, error: contributorError } = await supabase
      .from("contributors")
      .insert({
        nom: contributorName || null,
        email: contributorEmail || null,
      })
      .select("id")
      .single();

    if (contributorError) {
      return { success: false, error: "Impossible d'enregistrer le contributeur." };
    }
    uploadedBy = contributor.id;
  }

  const storagePath = `${filiere.code}/${annee}/${matiere}-${type}-${crypto.randomUUID()}-${slugifyFileName(
    file.name
  )}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { success: false, error: "Échec de l'envoi du fichier. Réessayez." };
  }

  const { error: insertError } = await supabase.from("documents").insert({
    filiere_id: filiereId,
    annee,
    matiere,
    type,
    description: description || "",
    file_url: storagePath,
    file_name: file.name,
    file_size: file.size,
    status: "pending",
    uploaded_by: uploadedBy,
  });

  if (insertError) {
    await supabase.storage.from("documents").remove([storagePath]);
    return { success: false, error: "Échec de l'enregistrement du document." };
  }

  await notifyAdminNewContribution({
    filiereNom: filiere.nom,
    annee,
    matiere,
    type,
    description: description || "",
    contributorName: contributorName || "",
    contributorEmail: contributorEmail || "",
  });

  return { success: true };
}
