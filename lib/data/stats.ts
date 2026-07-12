import "server-only";
import { createClient } from "@/lib/supabase/server";

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

export async function getGlobalStats(): Promise<GlobalStats> {
  const supabase = await createClient();
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
