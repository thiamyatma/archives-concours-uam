import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_PAGE_SIZE,
  getPageCount,
  getPageRange,
  type PaginatedResult,
} from "@/lib/pagination";
import type { Contributor } from "@/types/database";

export interface ContributorQuery {
  page?: number;
  /** Voir AdminDocumentQuery.withCount dans lib/data/documents.ts — même logique. */
  withCount?: boolean;
}

/**
 * Liste des contributeurs (admin uniquement — RLS restreint la lecture de
 * cette table aux sessions authentifiées, voir supabase/schema.sql). Aucune
 * jointure sur `documents` : afficher qui a contribué ne nécessite pas de
 * savoir quoi précisément, ce qui évite un N+1 (ou même un simple join)
 * pour une liste qui n'en a pas besoin.
 */
export async function getContributors(filters: ContributorQuery): Promise<
  Omit<PaginatedResult<Contributor>, "total" | "pageCount"> & {
    total: number | null;
    pageCount: number | null;
  }
> {
  const supabase = await createClient();
  const page = Math.max(filters.page ?? 1, 1);
  const { from, to } = getPageRange(page, DEFAULT_PAGE_SIZE);
  const withCount = filters.withCount ?? true;

  const { data, error, count } = await supabase
    .from("contributors")
    .select("*", withCount ? { count: "exact" } : undefined)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const total = withCount ? (count ?? 0) : null;

  return {
    items: data ?? [],
    total,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    pageCount: total === null ? null : getPageCount(total, DEFAULT_PAGE_SIZE),
  };
}
