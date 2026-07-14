import "server-only";
import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { env } from "@/lib/env";
import { getClientIp } from "@/lib/http/client-ip";

export { getClientIp };

function hashIp(ip: string) {
  // On ne stocke jamais l'IP en clair : seulement un hash à sens unique,
  // suffisant pour compter les requêtes sans identifier précisément un visiteur.
  return createHash("sha256").update(ip).digest("hex");
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

/**
 * Vérifie (et enregistre) une requête à l'assistant IA pour une IP donnée.
 * Limite glissante sur 24h, configurable via RAG_MAX_QUESTIONS_PER_IP_PER_DAY.
 * Le check + l'insert sont atomiques côté base (RPC `check_and_record_rag_rate_limit`,
 * verrou advisory transactionnel) pour éviter qu'une course entre requêtes
 * concurrentes de la même IP ne laisse passer plus que la limite.
 */
export async function checkAndRecordRagRateLimit(ip: string): Promise<RateLimitResult> {
  const limit = env.RAG_MAX_QUESTIONS_PER_IP_PER_DAY;
  const ipHash = hashIp(ip);
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("check_and_record_rag_rate_limit", {
    p_ip_hash: ipHash,
    p_limit: limit,
  });

  if (error) {
    console.error("Vérification du rate-limit RAG échouée:", error.message);
    // On n'ouvre jamais la vanne en cas d'erreur : mieux vaut refuser que
    // laisser passer un flux non contrôlé vers l'API Groq (facturée).
    return { allowed: false, remaining: 0, limit };
  }

  const row = data?.[0];
  return { allowed: row?.allowed ?? false, remaining: row?.remaining ?? 0, limit };
}
