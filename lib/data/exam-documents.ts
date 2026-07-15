import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

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
 * Document PDF publié pour un (département, année) sans passer par la
 * table admin complète — utilisé par la page épreuve publique quand aucun
 * contenu Markdown n'existe (voir app/departements/[code]/[annee]/page.tsx).
 */
export async function getPdfOnlyDocument(
  departementCode: string,
  annee: number
): Promise<{ fileName: string; description: string | null } | null> {
  const supabase = createServiceClient();

  const { data: link } = await supabase
    .from("exam_document_departments")
    .select("document_id")
    .eq("departement_code", departementCode)
    .eq("annee", annee)
    .maybeSingle();

  if (!link) return null;

  const { data: document } = await supabase
    .from("exam_documents")
    .select("file_name, description")
    .eq("id", link.document_id)
    .eq("statut", "publie")
    .maybeSingle();

  if (!document) return null;

  return { fileName: document.file_name, description: document.description };
}
