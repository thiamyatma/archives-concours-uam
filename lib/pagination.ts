/**
 * Pagination server-side par LIMIT/OFFSET (voir `getPageRange`), pas par
 * curseur : l'UI cible ("← Précédent 1 2 3 4 5 … 20 Suivant →") exige de
 * pouvoir sauter directement à une page arbitraire, ce qu'un curseur ne
 * permet pas par nature (un curseur n'encode que "la ligne après celle-ci",
 * pas "la ligne à l'offset N"). Le curseur serait le bon choix pour un flux
 * infini sans numéros de page ; ce n'est pas le besoin ici. Au volume
 * attendu (quelques milliers de lignes, pas des millions), la faiblesse
 * connue d'OFFSET (coût croissant avec l'offset) ne se manifeste pas :
 * même `OFFSET 5000` reste instantané sur un index adapté. Voir
 * `docs/PERFORMANCE.md` pour le contexte plus large.
 */

export const DEFAULT_PAGE_SIZE = 20;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export interface PaginatedResult<T> extends PaginationMeta {
  items: T[];
}

export function getPageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(Math.ceil(total / pageSize), 1);
}

/** Ramène une page hors bornes (0, négative, NaN, au-delà du total) dans [1, pageCount]. */
export function clampPage(page: number, pageCount: number): number {
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(Math.floor(page), Math.max(pageCount, 1));
}

/** Bornes `range(from, to)` (0-indexées, inclusives) pour Supabase/PostgREST. */
export function getPageRange(
  page: number,
  pageSize: number
): { from: number; to: number } {
  const safePage = Math.max(Math.floor(page), 1);
  const from = (safePage - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export const ELLIPSIS = "ellipsis" as const;
export type PageToken = number | typeof ELLIPSIS;

/**
 * Fenêtre de numéros de page à afficher, avec ellipses le cas échéant
 * (ex : `1 … 8 9 10 … 42`). `siblingCount` = pages voisines de la page
 * courante affichées de chaque côté ; le premier et le dernier numéro sont
 * toujours affichés pour garder ses repères dans la liste.
 */
export function getPageNumbers(
  current: number,
  total: number,
  siblingCount = 1
): PageToken[] {
  if (total <= 0) return [];
  if (total === 1) return [1];

  const totalNumbersToShow = siblingCount * 2 + 5;
  if (total <= totalNumbersToShow) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const safeCurrent = clampPage(current, total);
  const leftSibling = Math.max(safeCurrent - siblingCount, 1);
  const rightSibling = Math.min(safeCurrent + siblingCount, total);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;

  const pages: PageToken[] = [1];

  if (showLeftEllipsis) {
    pages.push(ELLIPSIS);
  } else {
    for (let p = 2; p < leftSibling; p++) pages.push(p);
  }

  for (let p = Math.max(leftSibling, 2); p <= Math.min(rightSibling, total - 1); p++) {
    pages.push(p);
  }

  if (showRightEllipsis) {
    pages.push(ELLIPSIS);
  } else {
    for (let p = rightSibling + 1; p < total; p++) pages.push(p);
  }

  pages.push(total);
  return pages;
}
