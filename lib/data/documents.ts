import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { CACHE_TAGS } from "@/lib/data/cache-tags";
import {
  DEFAULT_PAGE_SIZE,
  getPageCount,
  getPageRange,
  clampPage,
  type PaginatedResult,
} from "@/lib/pagination";
import type {
  DocumentMatiere,
  DocumentStatus,
  DocumentWithFiliere,
  PublicDocument,
} from "@/types/database";

export interface LibraryQuery {
  q?: string;
  filiereCode?: string;
  annee?: number;
  matiere?: DocumentMatiere;
  page?: number;
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

async function resolveFiliereId(filiereCode: string): Promise<string> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("filieres")
    .select("id")
    .eq("code", filiereCode)
    .maybeSingle();
  return data?.id ?? "00000000-0000-0000-0000-000000000000";
}

/**
 * Compte total (pour calculer `pageCount`) mis en cache par combinaison de
 * filtres, séparément du fetch des lignes de la page. `count: "exact"`
 * coûte un scan (même index-only) à chaque appel ; le nombre de résultats
 * pour un filtre donné ne change que quand un document est
 * approuvé/refusé/supprimé (rare comparé au nombre de pages consultées).
 * Invalidé par `revalidateTag(CACHE_TAGS.documents)` dans
 * `lib/actions/admin.ts`, avec un TTL court (5 min) en filet de sécurité.
 */
const fetchApprovedDocumentsCount = unstable_cache(
  async (filters: Omit<LibraryQuery, "page">): Promise<number> => {
    const supabase = createPublicClient();
    let query = supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved");

    if (filters.annee) query = query.eq("annee", filters.annee);
    if (filters.matiere) query = query.eq("matiere", filters.matiere);
    if (filters.q) query = query.ilike("description", `%${filters.q}%`);
    if (filters.filiereCode) {
      query = query.eq("filiere_id", await resolveFiliereId(filters.filiereCode));
    }

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  },
  ["approved-documents-count"],
  { tags: [CACHE_TAGS.documents], revalidate: 300 }
);

export async function getApprovedDocuments(
  filters: LibraryQuery
): Promise<PaginatedResult<PublicDocument>> {
  const supabase = await createClient();
  const { q, filiereCode, annee, matiere } = filters;

  // Compte (caché) et lignes de la page en parallèle : le total ne dépend
  // pas de la page demandée, pas besoin d'attendre l'un pour l'autre.
  const [total, filiereId] = await Promise.all([
    fetchApprovedDocumentsCount({ q, filiereCode, annee, matiere }),
    filiereCode ? resolveFiliereId(filiereCode) : Promise.resolve(undefined),
  ]);

  const pageCount = getPageCount(total, DEFAULT_PAGE_SIZE);
  const page = clampPage(filters.page ?? 1, pageCount);
  const { from, to } = getPageRange(page, DEFAULT_PAGE_SIZE);

  let query = supabase
    .from("documents")
    .select(PUBLIC_DOCUMENT_SELECT)
    .eq("status", "approved");

  if (annee) query = query.eq("annee", annee);
  if (matiere) query = query.eq("matiere", matiere);
  if (q) query = query.ilike("description", `%${q}%`);
  if (filiereId) query = query.eq("filiere_id", filiereId);

  // Index partiel documents_approved_browse_idx (annee desc, matiere) where
  // status = 'approved' : ce tri par défaut ne nécessite pas de sort en
  // mémoire, même avec un grand nombre de documents.
  const { data, error } = await query
    .order("annee", { ascending: false })
    .order("matiere", { ascending: true })
    .range(from, to);

  if (error) throw error;

  return {
    items: (data ?? []) as unknown as PublicDocument[],
    total,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    pageCount,
  };
}

/**
 * `cache()` : la page filière/année et son `generateMetadata` récupèrent
 * tous deux les documents de la session — sans dédup, c'est une requête en
 * double par chargement. Non paginée : bornée par construction à 4
 * matières × 2 types = 8 documents maximum pour une session donnée.
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
  /**
   * Calculer le total (donc `pageCount`) coûte un scan supplémentaire.
   * Le tableau admin ne le demande que pour la page 1 d'une combinaison
   * statut/recherche donnée et réutilise ensuite ce total côté client
   * tant que les filtres ne changent pas (voir `components/admin/admin-dashboard.tsx`).
   */
  withCount?: boolean;
}

export async function getAdminDocuments(filters: AdminDocumentQuery): Promise<
  Omit<PaginatedResult<DocumentWithFiliere>, "total" | "pageCount"> & {
    total: number | null;
    pageCount: number | null;
  }
> {
  const supabase = await createClient();
  const page = Math.max(filters.page ?? 1, 1);
  const { from, to } = getPageRange(page, DEFAULT_PAGE_SIZE);
  const withCount = filters.withCount ?? true;

  let query = supabase
    .from("documents")
    .select(ADMIN_DOCUMENT_SELECT, withCount ? { count: "exact" } : undefined);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.q) query = query.ilike("description", `%${filters.q}%`);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const total = withCount ? (count ?? 0) : null;

  return {
    items: (data ?? []) as unknown as DocumentWithFiliere[],
    total,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    pageCount: total === null ? null : getPageCount(total, DEFAULT_PAGE_SIZE),
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
