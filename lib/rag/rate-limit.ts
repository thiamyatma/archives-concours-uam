import "server-only";
import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { env } from "@/lib/env";

function hashIp(ip: string) {
  // On ne stocke jamais l'IP en clair : seulement un hash à sens unique,
  // suffisant pour compter les requêtes sans identifier précisément un visiteur.
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Extrait l'IP du visiteur à partir des en-têtes standards posés par les
 * plateformes d'hébergement (Vercel, proxies). Retombe sur "unknown" en local.
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

/**
 * Vérifie (et enregistre) une requête à l'assistant IA pour une IP donnée.
 * Limite glissante sur 24h, configurable via RAG_MAX_QUESTIONS_PER_IP_PER_DAY.
 */
export async function checkAndRecordRagRateLimit(ip: string): Promise<RateLimitResult> {
  const limit = env.RAG_MAX_QUESTIONS_PER_IP_PER_DAY;
  const ipHash = hashIp(ip);
  const supabase = createServiceClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count, error: countError } = await supabase
    .from("rag_query_log")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if (countError) {
    console.error("Vérification du rate-limit RAG échouée:", countError.message);
    // On n'ouvre jamais la vanne en cas d'erreur : mieux vaut refuser que
    // laisser passer un flux non contrôlé vers l'API Groq (facturée).
    return { allowed: false, remaining: 0, limit };
  }

  const used = count ?? 0;
  if (used >= limit) {
    return { allowed: false, remaining: 0, limit };
  }

  const { error: insertError } = await supabase
    .from("rag_query_log")
    .insert({ ip_hash: ipHash });

  if (insertError) {
    console.error("Enregistrement du rate-limit RAG échoué:", insertError.message);
  }

  return { allowed: true, remaining: Math.max(limit - used - 1, 0), limit };
}
