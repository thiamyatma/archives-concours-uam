import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  DocumentMatiere,
  DocumentStatus,
  DocumentWithFiliere,
  PublicDocument,
} from "@/types/database";

export const LIBRARY_PAGE_SIZE = 12;

export interface LibraryQuery {
  q?: string;
  filiereCode?: string;
  annee?: number;
  matiere?: DocumentMatiere;
  page?: number;
}

export interface PaginatedDocuments<T = DocumentWithFiliere> {
  documents: T[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * Colonnes réellement affichées côté public (bibliothèque, page année) :
 * évite de transférer `file_url`, `uploaded_by`, `rejection_reason`,
 * `reviewed_at`... qui n'ont aucun usage public et n'ont pas à quitter la
 * base pour ces lectures. L'admin (ADMIN_DOCUMENT_SELECT plus bas) a besoin
 * de tout, lui. Le type de retour (`PublicDocument`) reflète exactement
 * cette sélection réduite, pour ne pas laisser croire via le typage que
 * des colonnes non chargées seraient disponibles.
 */
const PUBLIC_DOCUMENT_SELECT =
  "id, filiere_id, annee, matiere, type, description, file_size, downloads, status, created_at, filieres ( id, code, nom )";

const ADMIN_DOCUMENT_SELECT = "*, filieres ( id, code, nom )";

export async function getApprovedDocuments(
  filters: LibraryQuery
): Promise<PaginatedDocuments<PublicDocument>> {
  const supabase = await createClient();
  const page = Math.max(filters.page ?? 1, 1);
  const from = (page - 1) * LIBRARY_PAGE_SIZE;
  const to = from + LIBRARY_PAGE_SIZE - 1;

  let query = supabase
    .from("documents")
    .select(PUBLIC_DOCUMENT_SELECT, { count: "exact" })
    .eq("status", "approved");

  if (filters.annee) query = query.eq("annee", filters.annee);
  if (filters.matiere) query = query.eq("matiere", filters.matiere);
  if (filters.q) query = query.ilike("description", `%${filters.q}%`);

  if (filters.filiereCode) {
    const { data: filiere } = await supabase
      .from("filieres")
      .select("id")
      .eq("code", filters.filiereCode)
      .maybeSingle();
    query = query.eq("filiere_id", filiere?.id ?? "00000000-0000-0000-0000-000000000000");
  }

  // Index partiel documents_approved_browse_idx (annee desc, matiere) where
  // status = 'approved' : ce tri par défaut ne nécessite pas de sort en
  // mémoire, même avec un grand nombre de documents.
  const { data, error, count } = await query
    .order("annee", { ascending: false })
    .order("matiere", { ascending: true })
    .range(from, to);

  if (error) throw error;

  const total = count ?? 0;

  return {
    documents: (data ?? []) as unknown as PublicDocument[],
    total,
    page,
    pageCount: Math.max(Math.ceil(total / LIBRARY_PAGE_SIZE), 1),
  };
}

/**
 * `cache()` : la page filière/année et son `generateMetadata` récupèrent
 * tous deux les documents de la session — sans dédup, c'est une requête en
 * double par chargement.
 */
export const getDocumentsByFiliereAnnee = cache(
  async (filiereId: string, annee: number): Promise<PublicDocument[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("documents")
      .select(PUBLIC_DOCUMENT_SELECT)
      .eq("filiere_id", filiereId)
      .eq("annee", annee)
      .eq("status", "approved")
      .order("matiere", { ascending: true });

    if (error) throw error;
    return (data ?? []) as unknown as PublicDocument[];
  }
);

export interface AdminDocumentQuery {
  status?: DocumentStatus;
  q?: string;
  page?: number;
}

export const ADMIN_PAGE_SIZE = 20;

export async function getAdminDocuments(
  filters: AdminDocumentQuery
): Promise<PaginatedDocuments> {
  const supabase = await createClient();
  const page = Math.max(filters.page ?? 1, 1);
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const to = from + ADMIN_PAGE_SIZE - 1;

  let query = supabase
    .from("documents")
    .select(ADMIN_DOCUMENT_SELECT, { count: "exact" });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.q) query = query.ilike("description", `%${filters.q}%`);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const total = count ?? 0;

  return {
    documents: (data ?? []) as unknown as DocumentWithFiliere[],
    total,
    page,
    pageCount: Math.max(Math.ceil(total / ADMIN_PAGE_SIZE), 1),
  };
}

export async function getPendingCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) throw error;
  return count ?? 0;
}
