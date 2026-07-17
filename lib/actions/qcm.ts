"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { getClientIp } from "@/lib/http/client-ip";
import { checkActionRateLimit } from "@/lib/rate-limit";

// Fenêtre + plafond volontairement larges : on VEUT enregistrer les vraies
// reprises d'un candidat (bouton « Recommencer »), le rate-limit ne sert
// qu'à empêcher un flux scripté d'inonder la table.
const ATTEMPT_RATE_LIMIT_WINDOW_SECONDS = 10 * 60;
const ATTEMPT_RATE_LIMIT = 40;

const attemptSchema = z.object({
  groupe: z.string().min(1).max(100),
  annee: z.number().int().min(2000).max(2100),
  matiere: z.string().min(1).max(100),
  departementCode: z.string().min(1).max(50),
  // Jeton aléatoire de navigateur (crypto.randomUUID), pas un compte.
  candidateId: z.string().min(8).max(64),
  totalQuestions: z.number().int().min(1).max(500),
  correctAnswers: z.number().int().min(0).max(500),
  scorePercent: z.number().int().min(0).max(100),
  durationSeconds: z
    .number()
    .int()
    .min(0)
    .max(24 * 60 * 60),
});

export type RecordQcmAttemptInput = z.input<typeof attemptSchema>;

/**
 * Best-effort : enregistre une tentative QCM terminée (clic sur « Voir ma
 * correction », voir components/qcm/qcm-runner.tsx) pour le tableau de bord
 * Analytics QCM (/admin/analytics). Jamais bloquant pour le candidat, aucune
 * erreur ne remonte au client. Anonyme : `candidateId` est un jeton de
 * navigateur, pas un compte ; les réponses détaillées ne sont pas envoyées,
 * seulement le score agrégé et la durée.
 */
export async function recordQcmAttempt(input: RecordQcmAttemptInput): Promise<void> {
  const parsed = attemptSchema.safeParse(input);
  if (!parsed.success) return;

  const data = parsed.data;
  // Garde-fou de cohérence : un score qui dépasse le nombre de questions est
  // rejeté silencieusement plutôt qu'enregistré comme donnée douteuse.
  if (data.correctAnswers > data.totalQuestions) return;

  const ip = getClientIp(await headers());
  const allowed = await checkActionRateLimit(
    ip,
    "qcm_attempt",
    ATTEMPT_RATE_LIMIT,
    ATTEMPT_RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) return;

  try {
    const supabase = createServiceClient();
    await supabase.from("qcm_attempts").insert({
      groupe: data.groupe,
      annee: data.annee,
      matiere: data.matiere,
      departement_code: data.departementCode,
      candidate_id: data.candidateId,
      total_questions: data.totalQuestions,
      correct_answers: data.correctAnswers,
      score_percent: data.scorePercent,
      duration_seconds: data.durationSeconds,
    });
  } catch {
    // ignoré intentionnellement
  }
}
