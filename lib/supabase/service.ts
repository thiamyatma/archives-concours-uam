import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/**
 * Client Supabase "service role" — contourne totalement RLS.
 * Réservé aux opérations serveur sensibles : recherche/rate-limiting de
 * l'assistant IA (lib/rag/*.ts) et téléchargement des PDF d'épreuves
 * (lib/actions/download-pdf.ts, lib/data/download-stats.ts). Ne JAMAIS
 * importer ce module depuis un composant client.
 */
export function createServiceClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY manquant(s) : impossible de créer le client service role."
    );
  }

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
