import "server-only";
import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { EXAM_PREVIEW_CACHE_TAG } from "@/lib/pdf/constants";

export interface ExamDocument {
  id: string;
  annee: number;
  fileName: string;
  storagePath: string;
  fileSize: number;
  description: string | null;
  statut: "publie" | "brouillon";
  createdAt: string;
  updatedAt: string;
  departementCodes: string[];
  downloads: number;
  views: number;
}

/**
 * Métadonnées du document publié d'un (département, année). Le même objet
 * sert au rendu de la page épreuve (nom/description, disponibilité du bouton
 * de téléchargement) et à la génération des URL signées — une seule
 * résolution en base pour les deux.
 */
export interface PublishedDocument {
  storagePath: string;
  fileName: string;
  description: string | null;
}

// Repli si un `revalidateTag` est manqué (déploiement partiel, mutation hors
// application). Le chemin nominal reste l'invalidation par tag depuis
// lib/actions/exam-documents.ts, déclenchée par toutes les mutations admin.
const PUBLISHED_DOCUMENT_REVALIDATE_SECONDS = 60 * 60;

/**
 * Tous les documents pour le tableau admin, agrégats calculés en base (RPC,
 * même esprit que `get_download_stats` — voir docs/DATABASE.md).
 */
export async function getExamDocuments(): Promise<ExamDocument[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("get_exam_documents_with_stats");

  if (error) {
    console.error("get_exam_documents_with_stats a échoué:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    annee: row.annee,
    fileName: row.file_name,
    storagePath: row.storage_path,
    fileSize: row.file_size,
    description: row.description,
    statut: row.statut as "publie" | "brouillon",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    departementCodes: row.departement_codes,
    downloads: row.downloads,
    views: row.views,
  }));
}

/**
 * Document publié lié à ce (département, année), ou `null`. Résolution
 * directe via la table de liaison — plus de `storage.list()` en boucle comme
 * l'ancien système à base de dossiers partagés.
 *
 * Version NON cachée : réservée aux appelants qui ont déjà leur propre cache
 * (génération d'URL signées, voir lib/actions/download-pdf.ts). Partout
 * ailleurs, utiliser `getPublishedDocument`.
 */
export async function fetchPublishedDocument(
  departementCode: string,
  annee: number
): Promise<PublishedDocument | null> {
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    // Service role indisponible (env non configuré) : traiter comme "aucun
    // document" plutôt que de faire échouer le rendu de la page.
    return null;
  }

  const { data: link } = await supabase
    .from("exam_document_departments")
    .select("document_id")
    .eq("departement_code", departementCode)
    .eq("annee", annee)
    .maybeSingle();
  if (!link) return null;

  const { data: document } = await supabase
    .from("exam_documents")
    .select("storage_path, file_name, description")
    .eq("id", link.document_id)
    .eq("statut", "publie")
    .maybeSingle();
  if (!document) return null;

  return {
    storagePath: document.storage_path,
    fileName: document.file_name,
    description: document.description,
  };
}

/**
 * Version cachée et partagée par (département, année), invalidée par
 * `EXAM_PREVIEW_CACHE_TAG` à chaque mutation admin. Appelée **côté serveur**
 * au rendu de la page épreuve : la valeur est figée dans le HTML statique,
 * donc une visite (humain ou robot) ne déclenche plus aucune requête
 * Supabase. Voir docs/PERFORMANCE.md.
 */
export const getPublishedDocument = unstable_cache(
  fetchPublishedDocument,
  ["exam-document-published"],
  {
    revalidate: PUBLISHED_DOCUMENT_REVALIDATE_SECONDS,
    tags: [EXAM_PREVIEW_CACHE_TAG],
  }
);

async function fetchPublishedPdfYears(departementCode: string): Promise<number[]> {
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return [];
  }

  const { data: links } = await supabase
    .from("exam_document_departments")
    .select("document_id, annee")
    .eq("departement_code", departementCode);
  if (!links || links.length === 0) return [];

  const { data: documents } = await supabase
    .from("exam_documents")
    .select("id")
    .in(
      "id",
      links.map((link) => link.document_id)
    )
    .eq("statut", "publie");
  if (!documents) return [];

  const publishedIds = new Set(documents.map((doc) => doc.id));
  return [
    ...new Set(
      links.filter((link) => publishedIds.has(link.document_id)).map((link) => link.annee)
    ),
  ];
}

/**
 * Années ayant un document PDF publié pour ce département — fusionnées avec
 * les années issues du Markdown au rendu de `/departements/[code]`. Cachée et
 * invalidée par tag, pour la même raison que `getPublishedDocument` : la page
 * reste statique ET ne coûte plus une requête par visiteur.
 */
export const getPublishedPdfYears = unstable_cache(
  fetchPublishedPdfYears,
  ["exam-document-published-years"],
  {
    revalidate: PUBLISHED_DOCUMENT_REVALIDATE_SECONDS,
    tags: [EXAM_PREVIEW_CACHE_TAG],
  }
);
