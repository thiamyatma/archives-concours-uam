"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { getClientIp } from "@/lib/http/client-ip";
import { checkActionRateLimit } from "@/lib/rate-limit";

// Assez large pour ne pas gêner un candidat qui relance le QCM plusieurs
// fois de suite (bouton « Recommencer »), assez court pour qu'un même
// visiteur ne gonfle pas indéfiniment le compteur en boucle.
const ATTEMPT_RATE_LIMIT_WINDOW_SECONDS = 10 * 60;

const attemptSchema = z.object({
  groupe: z.string().min(1),
  annee: z.number().int().min(2000).max(2100),
  matiere: z.string().min(1),
});

/**
 * Best-effort : compte une correction QCM générée (clic sur « Voir ma
 * correction », voir components/qcm/qcm-runner.tsx) pour le dashboard admin.
 * Même esprit que recordDocumentView (lib/actions/download-pdf.ts) : jamais
 * bloquant pour le candidat, aucune erreur ne remonte au client.
 */
export async function recordQcmAttempt(
  groupe: string,
  annee: number,
  matiere: string
): Promise<void> {
  const parsed = attemptSchema.safeParse({ groupe, annee, matiere });
  if (!parsed.success) return;

  const ip = getClientIp(await headers());
  const allowed = await checkActionRateLimit(
    `${ip}|${parsed.data.groupe}|${parsed.data.annee}|${parsed.data.matiere}`,
    "qcm_attempt",
    1,
    ATTEMPT_RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) return;

  try {
    const supabase = createServiceClient();
    await supabase.from("qcm_attempts").insert({
      groupe: parsed.data.groupe,
      annee: parsed.data.annee,
      matiere: parsed.data.matiere,
    });
  } catch {
    // ignoré intentionnellement
  }
}
