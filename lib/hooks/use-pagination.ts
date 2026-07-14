"use client";

import { useCallback, useState } from "react";
import { clampPage, getPageCount } from "@/lib/pagination";

export interface UsePaginationOptions {
  /** Nombre total de résultats connu (0 tant que la 1ère page n'a pas chargé). */
  total: number;
  pageSize: number;
  initialPage?: number;
}

export interface UsePaginationResult {
  page: number;
  pageCount: number;
  setPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  /** À appeler quand un filtre/une recherche change : revient à la page 1. */
  resetPage: () => void;
}

/**
 * Pagination pilotée par état local React, pour les contextes qui ne sont
 * *pas* des Server Components rendus via l'URL (tableau admin en React
 * Query, par exemple) — voir `components/shared/pagination.tsx` en mode
 * `renderHref` pour l'équivalent server-side. Centralise la logique de
 * clamp (page hors bornes) et les raccourcis suivant/précédent plutôt que
 * de les dupliquer dans chaque composant qui pagine côté client.
 */
export function usePagination({
  total,
  pageSize,
  initialPage = 1,
}: UsePaginationOptions): UsePaginationResult {
  const [page, setPageState] = useState(initialPage);
  const pageCount = getPageCount(total, pageSize);

  const setPage = useCallback(
    (next: number) => {
      setPageState(clampPage(next, pageCount));
    },
    [pageCount]
  );

  const goToNextPage = useCallback(() => setPage(page + 1), [page, setPage]);
  const goToPreviousPage = useCallback(() => setPage(page - 1), [page, setPage]);
  const resetPage = useCallback(() => setPageState(1), []);

  return {
    page,
    pageCount,
    setPage,
    goToNextPage,
    goToPreviousPage,
    hasNextPage: page < pageCount,
    hasPreviousPage: page > 1,
    resetPage,
  };
}
