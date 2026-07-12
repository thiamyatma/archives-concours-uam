import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  DocumentMatiere,
  DocumentStatus,
  DocumentWithFiliere,
} from "@/types/database";

export const LIBRARY_PAGE_SIZE = 12;

export interface LibraryQuery {
  q?: string;
  filiereCode?: string;
  annee?: number;
  matiere?: DocumentMatiere;
  page?: number;
}

export interface PaginatedDocuments {
  documents: DocumentWithFiliere[];
  total: number;
  page: number;
  pageCount: number;
}

const DOCUMENT_SELECT = "*, filieres ( id, code, nom )";

export async function getApprovedDocuments(
  filters: LibraryQuery
): Promise<PaginatedDocuments> {
  const supabase = await createClient();
  const page = Math.max(filters.page ?? 1, 1);
  const from = (page - 1) * LIBRARY_PAGE_SIZE;
  const to = from + LIBRARY_PAGE_SIZE - 1;

  let query = supabase
    .from("documents")
    .select(DOCUMENT_SELECT, { count: "exact" })
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

  const { data, error, count } = await query
    .order("annee", { ascending: false })
    .order("matiere", { ascending: true })
    .range(from, to);

  if (error) throw error;

  const total = count ?? 0;

  return {
    documents: (data ?? []) as unknown as DocumentWithFiliere[],
    total,
    page,
    pageCount: Math.max(Math.ceil(total / LIBRARY_PAGE_SIZE), 1),
  };
}

export async function getDocumentsByFiliereAnnee(
  filiereId: string,
  annee: number
): Promise<DocumentWithFiliere[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_SELECT)
    .eq("filiere_id", filiereId)
    .eq("annee", annee)
    .eq("status", "approved")
    .order("matiere", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as DocumentWithFiliere[];
}

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

  let query = supabase.from("documents").select(DOCUMENT_SELECT, { count: "exact" });

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

export async function getDocumentById(id: string): Promise<DocumentWithFiliere | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as DocumentWithFiliere | null;
}
