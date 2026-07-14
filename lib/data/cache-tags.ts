/**
 * Tags de cache (Next.js `unstable_cache` / `revalidateTag`) pour les
 * lectures publiques globales, non personnalisées. Invalidées à la demande
 * par les Server Actions admin (approve/reject/delete) plutôt que par un
 * TTL court — voir docs/PERFORMANCE.md.
 */
export const CACHE_TAGS = {
  filieres: "filieres",
  globalStats: "global-stats",
  /** Compte total de documents approuvés par combinaison de filtres (bibliothèque) — voir lib/data/documents.ts. */
  documents: "documents-count",
} as const;
