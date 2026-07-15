"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { getDepartementByCode } from "@/lib/departements";
import { PDF_BUCKET } from "@/lib/pdf/constants";
import { getClientIp } from "@/lib/http/client-ip";
import { checkActionRateLimit } from "@/lib/rate-limit";

const SIGNED_URL_TTL_SECONDS = 60;
const DOWNLOAD_RATE_LIMIT = 30;
const DOWNLOAD_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const VIEW_RATE_LIMIT_WINDOW_SECONDS = 30 * 60;

const requestSchema = z.object({
  departementCode: z.string().min(1),
  annee: z.number().int().min(2000).max(2100),
});

export interface PdfAvailability {
  available: boolean;
}

export type PdfDownloadResult = { url: string; fileName: string } | { error: string };
export type PdfPreviewResult = { url: string } | { error: string };

interface PublishedDocument {
  storagePath: string;
  fileName: string;
}

/**
 * Document publié lié à ce (département, année), ou `null`. Une résolution
 * directe (via la table de liaison), plus de `storage.list()` en boucle
 * comme l'ancien système à base de dossiers partagés.
 */
async function findPublishedDocument(
  supabase: ReturnType<typeof createServiceClient>,
  departementCode: string,
  annee: number
): Promise<PublishedDocument | null> {
  const { data: link } = await supabase
    .from("exam_document_departments")
    .select("document_id")
    .eq("departement_code", departementCode)
    .eq("annee", annee)
    .maybeSingle();
  if (!link) return null;

  const { data: document } = await supabase
    .from("exam_documents")
    .select("storage_path, file_name")
    .eq("id", link.document_id)
    .eq("statut", "publie")
    .maybeSingle();
  if (!document) return null;

  return { storagePath: document.storage_path, fileName: document.file_name };
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
    const document = await findPublishedDocument(
      supabase,
      departement.code,
      parsed.data.annee
    );
    return { available: document !== null };
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

  const document = await findPublishedDocument(
    supabase,
    departement.code,
    parsed.data.annee
  );
  if (!document) {
    return { error: "Aucun PDF disponible pour cette session." };
  }

  const { data, error } = await supabase.storage
    .from(PDF_BUCKET)
    .createSignedUrl(document.storagePath, SIGNED_URL_TTL_SECONDS, {
      download: document.fileName,
    });

  if (error || !data) {
    return { error: "Impossible de générer le lien de téléchargement." };
  }

  // Best-effort : un échec du log (réseau, etc.) ne doit jamais empêcher
  // de renvoyer l'URL déjà générée avec succès.
  try {
    await supabase.from("pdf_downloads").insert({
      departement_code: departement.code,
      annee: parsed.data.annee,
      file_name: document.fileName,
    });
  } catch {
    // ignoré intentionnellement
  }

  return { url: data.signedUrl, fileName: document.fileName };
}

/** Comme `getExamPdfDownloadUrl`, mais pour un affichage inline ("Consulter"). */
export async function getDocumentPreviewUrl(
  departementCode: string,
  annee: number
): Promise<PdfPreviewResult> {
  const parsed = requestSchema.safeParse({ departementCode, annee });
  if (!parsed.success) return { error: "Requête invalide." };

  const departement = getDepartementByCode(parsed.data.departementCode);
  if (!departement) return { error: "Département introuvable." };

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return { error: "Consultation momentanément indisponible." };
  }

  const document = await findPublishedDocument(
    supabase,
    departement.code,
    parsed.data.annee
  );
  if (!document) return { error: "Aucun PDF disponible pour cette session." };

  const { data, error } = await supabase.storage
    .from(PDF_BUCKET)
    .createSignedUrl(document.storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return { error: "Impossible de générer le lien de consultation." };

  return { url: data.signedUrl };
}

/**
 * Années ayant un document PDF publié pour ce département, au-delà des
 * années déjà listées via le Markdown — utilisé pour enrichir
 * `DepartementYearsList` côté client sans rendre la page elle-même
 * dynamique (voir docs/ARCHITECTURE.md).
 */
export async function getAdditionalYears(departementCode: string): Promise<number[]> {
  const departement = getDepartementByCode(departementCode);
  if (!departement) return [];

  try {
    const supabase = createServiceClient();
    const { data: links } = await supabase
      .from("exam_document_departments")
      .select("document_id, annee")
      .eq("departement_code", departement.code);
    if (!links || links.length === 0) return [];

    const { data: documents } = await supabase
      .from("exam_documents")
      .select("id, statut")
      .in(
        "id",
        links.map((link) => link.document_id)
      )
      .eq("statut", "publie");
    if (!documents) return [];

    const publishedIds = new Set(documents.map((doc) => doc.id));
    return [
      ...new Set(
        links
          .filter((link) => publishedIds.has(link.document_id))
          .map((link) => link.annee)
      ),
    ];
  } catch {
    return [];
  }
}

const recordViewSchema = z.object({
  departementCode: z.string().min(1),
  annee: z.number().int().min(2000).max(2100),
});

/** Best-effort : compte une consultation de page pour le dashboard admin. */
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
  const allowed = await checkActionRateLimit(
    `${ip}|${departement.code}|${parsed.data.annee}`,
    "document_view",
    1,
    VIEW_RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) return;

  try {
    const supabase = createServiceClient();
    await supabase.from("exam_document_views").insert({
      departement_code: departement.code,
      annee: parsed.data.annee,
    });
  } catch {
    // ignoré intentionnellement
  }
}
