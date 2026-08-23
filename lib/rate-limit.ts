import "server-only";
import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Hachage de la clé de limitation (IP, éventuellement composée avec la
 * ressource visée). Exporté pour les actions qui ont leur propre RPC
 * fusionnée — `record_exam_document_view` par exemple — et doivent produire
 * exactement la même clé que `checkActionRateLimit`, puisqu'elles partagent
 * la table `action_rate_limits`.
 */
export function hashRateLimitKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Issue d'une vérification de quota. `denied` et `unavailable` refusent tous
 * les deux le passage, mais pour des raisons opposées, et l'appelant doit
 * pouvoir les distinguer pour ne pas mentir à l'utilisateur :
 *
 * - `denied` — le quota est réellement atteint. Réessayer plus tard marche.
 * - `unavailable` — la vérification elle-même a échoué (base injoignable).
 *   Réessayer ne changera rien tant que le service n'est pas rétabli.
 *
 * Un booléen unique confondait les deux : lors de la suspension du projet
 * Supabase, la page de connexion admin annonçait « Trop de tentatives » dès
 * la première tentative, envoyant chercher un problème inexistant.
 */
export type RateLimitVerdict = "allowed" | "denied" | "unavailable";

/**
 * Limiteur générique par clé (IP hashée) + action, pour les Server Actions
 * publiques qui n'ont pas besoin d'une fenêtre glissante dédiée comme le RAG
 * (voir lib/rag/rate-limit.ts). Check + insert atomiques côté base (RPC
 * `check_action_rate_limit`, verrou advisory transactionnel).
 *
 * Ne renvoie JAMAIS `allowed` quand la vérification échoue : mieux vaut
 * refuser une requête légitime que laisser passer un flux non contrôlé.
 */
export async function checkActionRateLimit(
  ip: string,
  action: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitVerdict> {
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (error) {
    console.error(`Rate-limit (${action}) : client indisponible`, error);
    return "unavailable";
  }

  const { data, error } = await supabase.rpc("check_action_rate_limit", {
    p_key_hash: hashRateLimitKey(ip),
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error(`Vérification du rate-limit (${action}) échouée:`, error.message);
    return "unavailable";
  }

  return data === true ? "allowed" : "denied";
}
