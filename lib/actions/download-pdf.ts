"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getDepartementByCode } from "@/lib/departements";
import { fetchPublishedDocument } from "@/lib/data/exam-documents";
import { EXAM_PREVIEW_CACHE_TAG, PDF_BUCKET } from "@/lib/pdf/constants";
import { getClientIp } from "@/lib/http/client-ip";
import { checkActionRateLimit, hashRateLimitKey } from "@/lib/rate-limit";

// TTL des URL signées de téléchargement et d'aperçu. 1 h : assez pour une
// lecture inline (plusieurs minutes) ou un téléchargement lent, et surtout
// pour survivre à la fenêtre de mise en cache ci-dessous. Ce sont des PDF
// d'épreuves publics (aucune confidentialité) — une URL partageable 1 h ne
// pose pas de risque, la génération restant plafonnée par le rate-limit.
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const PREVIEW_URL_TTL_SECONDS = 60 * 60;
// Durée de mise en cache (Next Data Cache) des URL signées, plus courte que
// leur TTL : une URL régénérée toutes les 50 min reste toujours valide au
// moins 10 min quand elle est servie. Effet : une seule URL signée par
// (département, année) est partagée par tous les visiteurs et tous les
// re-téléchargements de la fenêtre — le fichier a alors une clé d'URL stable,
// donc réellement mis en cache par le navigateur/CDN au lieu d'être
// re-téléchargé (uncached) avec une URL unique à chaque fois.
const SIGNED_URL_CACHE_REVALIDATE_SECONDS = 50 * 60;
const DOWNLOAD_RATE_LIMIT = 30;
const DOWNLOAD_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const VIEW_RATE_LIMIT_WINDOW_SECONDS = 30 * 60;
// Aperçu PDF : la génération d'URL est déjà globalement plafonnée par le
// cache ci-dessus (≤ 1 par 50 min par épreuve) ; ce rate-limit ne fait que
// contenir le martèlement scripté de l'action elle-même. Assez large pour
// qu'un visiteur légitime puisse rouvrir l'aperçu plusieurs fois.
const PREVIEW_RATE_LIMIT = 8;
const PREVIEW_RATE_LIMIT_WINDOW_SECONDS = 30 * 60;

const requestSchema = z.object({
  departementCode: z.string().min(1),
  annee: z.number().int().min(2000).max(2100),
});

export type PdfDownloadResult = { url: string; fileName: string } | { error: string };
export type PdfPreviewResult = { url: string } | { error: string };

/**
 * Génère (sans cache) l'URL signée de téléchargement (avec disposition
 * `attachment`) pour une épreuve publiée. Isolée pour être enveloppée par
 * `unstable_cache`, comme `generatePreviewUrl`.
 */
async function generateDownloadData(
  departementCode: string,
  annee: number
): Promise<{ url: string; fileName: string } | null> {
  const document = await fetchPublishedDocument(departementCode, annee);
  if (!document) return null;

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(PDF_BUCKET)
    .createSignedUrl(document.storagePath, SIGNED_URL_TTL_SECONDS, {
      download: document.fileName,
    });

  if (error || !data) return null;
  return { url: data.signedUrl, fileName: document.fileName };
}

// URL de téléchargement mise en cache et partagée par (département, année) —
// même principe que l'aperçu : un re-téléchargement du même fichier réutilise
// l'URL stable au lieu d'en régénérer une unique (donc uncached). Invalidée
// par les mutations admin via `EXAM_PREVIEW_CACHE_TAG`.
const getCachedDownloadData = unstable_cache(
  generateDownloadData,
  ["exam-document-download"],
  { revalidate: SIGNED_URL_CACHE_REVALIDATE_SECONDS, tags: [EXAM_PREVIEW_CACHE_TAG] }
);

/**
 * URL signée de téléchargement pour le PDF de la session. N'est appelée
 * qu'au clic (jamais au build/montage). L'URL est mise en cache et partagée
 * (`getCachedDownloadData`) pour que les re-téléchargements bénéficient du
 * cache CDN ; le rate-limit et le log `pdf_downloads` restent par clic.
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
  const verdict = await checkActionRateLimit(
    ip,
    "pdf_download",
    DOWNLOAD_RATE_LIMIT,
    DOWNLOAD_RATE_LIMIT_WINDOW_SECONDS
  );
  if (verdict === "unavailable") {
    return { error: "Service temporairement indisponible. Réessayez plus tard." };
  }
  if (verdict === "denied") {
    return { error: "Trop de téléchargements. Réessayez dans quelques minutes." };
  }

  const download = await getCachedDownloadData(departement.code, parsed.data.annee);
  if (!download) {
    return { error: "Aucun PDF disponible pour cette session." };
  }

  // Log par clic (jamais mis en cache) : un événement par téléchargement réel.
  // Best-effort — un échec du log ne doit pas empêcher de renvoyer l'URL.
  try {
    const supabase = createServiceClient();
    await supabase.from("pdf_downloads").insert({
      departement_code: departement.code,
      annee: parsed.data.annee,
      file_name: download.fileName,
    });
  } catch {
    // ignoré intentionnellement
  }

  return { url: download.url, fileName: download.fileName };
}

/**
 * Génère (sans cache) l'URL signée d'aperçu pour une épreuve publiée.
 * Isolée pour être enveloppée par `unstable_cache` : elle crée son propre
 * client Supabase (rien de non-sérialisable en argument), à la manière de
 * lib/contest/settings.ts#fetchRow.
 */
async function generatePreviewUrl(
  departementCode: string,
  annee: number
): Promise<string | null> {
  const document = await fetchPublishedDocument(departementCode, annee);
  if (!document) return null;

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(PDF_BUCKET)
    .createSignedUrl(document.storagePath, PREVIEW_URL_TTL_SECONDS);

  if (error || !data) return null;
  return data.signedUrl;
}

// URL signée mise en cache par (département, année) : réutilisée pendant sa
// fenêtre de revalidation par tous les visiteurs, au lieu d'un
// `createSignedUrl` (et d'une URL unique) à chaque appel. Invalidée par les
// actions admin via le tag `EXAM_PREVIEW_CACHE_TAG` (voir
// lib/actions/exam-documents.ts) pour ne jamais servir un lien vers un
// `storage_path` obsolète après un remplacement.
const getCachedPreviewUrl = unstable_cache(
  generatePreviewUrl,
  ["exam-document-preview"],
  {
    revalidate: SIGNED_URL_CACHE_REVALIDATE_SECONDS,
    tags: [EXAM_PREVIEW_CACHE_TAG],
  }
);

/**
 * URL signée pour un affichage inline ("Consulter", visionneuse intégrée) —
 * TTL plus long, pas de log dans `pdf_downloads` (ce n'est pas un
 * téléchargement). N'est appelée qu'au clic explicite de l'utilisateur
 * (jamais au montage de la page). L'URL est mise en cache et partagée
 * (voir `getCachedPreviewUrl`), et l'action est rate-limitée en défense
 * contre un appel scripté.
 */
export async function getDocumentPreviewUrl(
  departementCode: string,
  annee: number
): Promise<PdfPreviewResult> {
  const parsed = requestSchema.safeParse({ departementCode, annee });
  if (!parsed.success) return { error: "Requête invalide." };

  const departement = getDepartementByCode(parsed.data.departementCode);
  if (!departement) return { error: "Département introuvable." };

  const ip = getClientIp(await headers());
  const verdict = await checkActionRateLimit(
    `${ip}|${departement.code}|${parsed.data.annee}`,
    "document_preview",
    PREVIEW_RATE_LIMIT,
    PREVIEW_RATE_LIMIT_WINDOW_SECONDS
  );
  if (verdict === "unavailable") {
    return { error: "Service temporairement indisponible. Réessayez plus tard." };
  }
  if (verdict === "denied") {
    return { error: "Trop de consultations. Réessayez dans quelques minutes." };
  }

  const url = await getCachedPreviewUrl(departement.code, parsed.data.annee);
  if (!url) return { error: "Aucun PDF disponible pour cette session." };

  return { url };
}

const recordViewSchema = z.object({
  departementCode: z.string().min(1),
  annee: z.number().int().min(2000).max(2100),
});

/**
 * Best-effort : compte une consultation de page pour le dashboard admin.
 *
 * Un seul aller-retour (`record_exam_document_view`) : limitation ET
 * enregistrement dans la même transaction. C'est la seule écriture qui reste
 * sur le chemin d'une visite — elle ne peut pas être cachée, autant qu'elle
 * ne coûte qu'un appel. Côté client, l'appel n'est déclenché qu'après un
 * délai d'engagement (voir components/shared/record-document-view.tsx), ce
 * qui écarte l'essentiel du trafic robot.
 */
export async function recordDocumentView(
  departementCode: string,
  annee: number
): Promise<void> {
  const parsed = recordViewSchema.safeParse({ departementCode, annee });
  if (!parsed.success) return;

  const departement = getDepartementByCode(parsed.data.departementCode);
  if (!departement) return;

  const ip = getClientIp(await headers());
  // Clé composite (IP + département + année) : sinon un visiteur qui
  // consulte une épreuve bloquerait le comptage de toutes les autres
  // pendant la fenêtre de limitation.
  const keyHash = hashRateLimitKey(`${ip}|${departement.code}|${parsed.data.annee}`);

  try {
    const supabase = createServiceClient();
    await supabase.rpc("record_exam_document_view", {
      p_key_hash: keyHash,
      p_departement_code: departement.code,
      p_annee: parsed.data.annee,
      p_window_seconds: VIEW_RATE_LIMIT_WINDOW_SECONDS,
    });
  } catch {
    // ignoré intentionnellement
  }
}
