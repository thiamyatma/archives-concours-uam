import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { CACHE_TAGS } from "@/lib/data/cache-tags";

export interface GlobalStats {
  totalDocuments: number;
  totalDownloads: number;
  totalContributors: number;
}

const FALLBACK_STATS: GlobalStats = {
  totalDocuments: 0,
  totalDownloads: 0,
  totalContributors: 0,
};

async function fetchGlobalStats(): Promise<GlobalStats> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_global_stats");

  if (error) throw error;
  const row = data?.[0];
  if (!row) return FALLBACK_STATS;

  return {
    totalDocuments: row.total_documents,
    totalDownloads: row.total_downloads,
    totalContributors: row.total_contributors,
  };
}

/**
 * Statistiques globales de la page d'accueil (nombre de documents, de
 * téléchargements, de contributeurs). Identiques pour tous les visiteurs :
 * mises en cache inter-requêtes (`unstable_cache`, longue durée) plutôt que
 * recalculées à chaque chargement de page, et invalidées explicitement par
 * `revalidateTag` quand un document est approuvé/refusé/supprimé (voir
 * `lib/actions/admin.ts`) — la fraîcheur ne dépend donc pas d'un TTL court.
 * `cache()` (React) déduplique en plus les appels multiples au sein d'un
 * même rendu (ex: layout + page).
 */
export const getGlobalStats = cache(
  unstable_cache(fetchGlobalStats, ["global-stats"], {
    tags: [CACHE_TAGS.globalStats],
    revalidate: 3600,
  })
);
