import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export interface RetrievedChunk {
  chunkId: string;
  pageUrl: string;
  pageTitle: string;
  section: string;
  content: string;
  rank: number;
}

/**
 * Retrouve les passages de polytech.sn les plus pertinents pour une question,
 * via la fonction Postgres `search_polytech_chunks` (full-text français).
 *
 * Pas d'embeddings : l'API Groq n'expose pas d'endpoint d'embeddings, et
 * la recherche plein texte Postgres suffit pour un site institutionnel de
 * taille modeste. Voir docs/RAG.md pour le détail du choix.
 */
export async function searchPolytechChunks(
  question: string,
  matchCount = 6
): Promise<RetrievedChunk[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("search_polytech_chunks", {
    search_query: question,
    match_count: matchCount,
  });

  if (error) {
    console.error("search_polytech_chunks a échoué:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    chunkId: row.chunk_id,
    pageUrl: row.page_url,
    pageTitle: row.page_title,
    section: row.section,
    content: row.content,
    rank: row.rank,
  }));
}
