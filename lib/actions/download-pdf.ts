"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { getDepartementByCode } from "@/lib/departements";
import { buildDownloadFileName, candidatePdfPaths } from "@/lib/pdf/resolve";
import { getClientIp } from "@/lib/http/client-ip";
import { checkActionRateLimit } from "@/lib/rate-limit";

const PDF_BUCKET = "exam-pdfs";
const SIGNED_URL_TTL_SECONDS = 60;
const DOWNLOAD_RATE_LIMIT = 30;
const DOWNLOAD_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

const requestSchema = z.object({
  departementCode: z.string().min(1),
  annee: z.number().int().min(2000).max(2100),
});

export interface PdfAvailability {
  available: boolean;
}

export type PdfDownloadResult = { url: string; fileName: string } | { error: string };

/**
 * Le premier chemin candidat (propre au département) qui existe réellement
 * dans le bucket, ou `null`. Un seul appel `list` par candidat — léger,
 * pas de génération d'URL signée (utilisé pour l'état du bouton, pas pour
 * le téléchargement lui-même).
 */
async function findExistingPdfPath(
  supabase: ReturnType<typeof createServiceClient>,
  candidates: string[]
): Promise<string | null> {
  for (const path of candidates) {
    const slashIndex = path.lastIndexOf("/");
    const dir = path.slice(0, slashIndex);
    const fileName = path.slice(slashIndex + 1);

    const { data, error } = await supabase.storage.from(PDF_BUCKET).list(dir, {
      search: fileName,
    });
    if (!error && data?.some((entry) => entry.name === fileName)) {
      return path;
    }
  }
  return null;
}

/** Vérifie si un PDF est disponible pour (département, année), sans le télécharger. */
export async function checkExamPdfAvailability(
  departementCode: string,
  annee: number
): Promise<PdfAvailability> {
  const parsed = requestSchema.safeParse({ departementCode, annee });
  if (!parsed.success) return { available: false };

  const departement = getDepartementByCode(parsed.data.departementCode);
  if (!departement) return { available: false };

  try {
    const supabase = createServiceClient();
    const candidates = candidatePdfPaths(departement, parsed.data.annee);
    const found = await findExistingPdfPath(supabase, candidates);
    return { available: found !== null };
  } catch {
    // Service role indisponible (env non configuré) : traiter comme
    // "non disponible" plutôt que de faire planter le bouton.
    return { available: false };
  }
}

/**
 * Génère une URL signée de courte durée pour le PDF de la session, et
 * enregistre l'événement dans `pdf_downloads`. N'est appelée qu'au clic
 * (jamais au build, jamais au montage de la page).
 */
export async function getExamPdfDownloadUrl(
  departementCode: string,
  annee: number
): Promise<PdfDownloadResult> {
  const parsed = requestSchema.safeParse({ departementCode, annee });
  if (!parsed.success) {
    return { error: "Requête invalide." };
  }

  const departement = getDepartementByCode(parsed.data.departementCode);
  if (!departement) {
    return { error: "Département introuvable." };
  }

  const ip = getClientIp(await headers());
  const allowed = await checkActionRateLimit(
    ip,
    "pdf_download",
    DOWNLOAD_RATE_LIMIT,
    DOWNLOAD_RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) {
    return { error: "Trop de téléchargements. Réessayez dans quelques minutes." };
  }

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return { error: "Téléchargement momentanément indisponible." };
  }

  const fileName = buildDownloadFileName(departement.code, parsed.data.annee);
  const candidates = candidatePdfPaths(departement, parsed.data.annee);
  const path = await findExistingPdfPath(supabase, candidates);

  if (!path) {
    return { error: "Aucun PDF disponible pour cette session." };
  }

  const { data, error } = await supabase.storage
    .from(PDF_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, { download: fileName });

  if (error || !data) {
    return { error: "Impossible de générer le lien de téléchargement." };
  }

  // Best-effort : un échec du log (réseau, etc.) ne doit jamais empêcher
  // de renvoyer l'URL déjà générée avec succès.
  try {
    await supabase.from("pdf_downloads").insert({
      departement_code: departement.code,
      annee: parsed.data.annee,
      file_name: fileName,
    });
  } catch {
    // ignoré intentionnellement
  }

  return { url: data.signedUrl, fileName };
}
