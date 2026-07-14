import "server-only";
import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Limiteur générique par clé (IP hashée) + action, pour les Server Actions
 * publiques qui n'ont pas besoin d'une fenêtre glissante dédiée comme le RAG
 * (voir lib/rag/rate-limit.ts). Check + insert atomiques côté base (RPC
 * `check_action_rate_limit`, verrou advisory transactionnel).
 */
export async function checkActionRateLimit(
  ip: string,
  action: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("check_action_rate_limit", {
    p_key_hash: hashKey(ip),
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error(`Vérification du rate-limit (${action}) échouée:`, error.message);
    // On n'ouvre jamais la vanne en cas d'erreur : mieux vaut refuser une
    // requête légitime que laisser passer un flux non contrôlé.
    return false;
  }

  return data === true;
}
