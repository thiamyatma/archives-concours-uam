import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/**
 * Client anonyme, sans lecture de cookies, pour les données publiques
 * identiques pour tout le monde (stats globales, comptage par filière).
 *
 * `lib/supabase/server.ts` lit les cookies de session à chaque appel — ce
 * qui est correct pour une donnée qui dépend de l'utilisateur, mais est un
 * anti-pattern dès qu'on veut mettre le résultat en cache inter-requêtes
 * avec `unstable_cache` (le cache serait alors implicitement lié à la
 * session de la première requête qui l'a rempli). Ces lectures n'ayant
 * besoin d'aucune session, ce client dédié rend le cache correct et
 * partageable entre tous les visiteurs.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
