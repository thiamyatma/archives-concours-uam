"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { requireAdminSession } from "@/lib/actions/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getDepartementByCode } from "@/lib/departements";
import { getContestSettings } from "@/lib/contest/settings";
import { findInscription } from "@/lib/inscriptions/data";
import { normalizeSearchText } from "@/lib/text/normalize";
import { getClientIp } from "@/lib/http/client-ip";
import { checkActionRateLimit } from "@/lib/rate-limit";

// Assez large pour laisser un candidat corriger quelques fautes de frappe,
// assez bas pour empêcher un script de deviner une paire nom/email valide
// par force brute (voir la note de non-énumération plus bas).
const VERIFICATION_RATE_LIMIT = 10;
const VERIFICATION_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

const rowSchema = z.object({
  nom: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
});

const importSchema = z.object({
  departementCode: z.string().min(1),
  rows: z.array(rowSchema).min(1).max(5000),
});

export type ImportInscriptionsInput = z.infer<typeof importSchema>;

/**
 * Import (admin) de la liste d'inscrits d'un département pour l'année en
 * cours (`contest_settings.year` — jamais une année soumise par le client,
 * pour ne pas pouvoir écrire dans une autre année). Upsert sur (année,
 * email normalisé) : un ré-import corrige les lignes déjà présentes plutôt
 * que de créer des doublons — voir docs/verification-admis.md.
 */
export async function importInscriptions(
  input: ImportInscriptionsInput
): Promise<{ success: true; imported: number } | { error: string }> {
  await requireAdminSession();

  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return { error: "Requête invalide." };
  const { departementCode, rows } = parsed.data;

  const departement = getDepartementByCode(departementCode);
  if (!departement) return { error: "Département inconnu." };

  const { year: annee } = await getContestSettings();

  // Déduplique par email normalisé AU SEIN du lot collé : un envoi upsert
  // contenant deux fois la même clé de conflit échoue côté Postgres ("cannot
  // affect row a second time"). La dernière occurrence gagne — comportement
  // cohérent avec un ré-import complet qui écraserait la même ligne.
  const byEmail = new Map<string, (typeof rows)[number]>();
  for (const row of rows) byEmail.set(normalizeSearchText(row.email), row);

  const payload = Array.from(byEmail.entries()).map(([emailNormalise, row]) => ({
    departement_code: departement.code,
    annee,
    nom: row.nom,
    nom_normalise: normalizeSearchText(row.nom),
    email: row.email,
    email_normalise: emailNormalise,
  }));

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("concours_inscriptions")
    .upsert(payload, { onConflict: "annee,email_normalise" });

  if (error) {
    console.error("importInscriptions a échoué:", error.message);
    return { error: "Échec de l'import." };
  }

  return { success: true, imported: payload.length };
}

const clearSchema = z.object({ departementCode: z.string().min(1) });

/** Supprime toutes les inscriptions importées d'un département pour l'année en cours (re-import propre). */
export async function clearInscriptions(
  input: z.infer<typeof clearSchema>
): Promise<{ success: true } | { error: string }> {
  await requireAdminSession();

  const parsed = clearSchema.safeParse(input);
  if (!parsed.success) return { error: "Requête invalide." };

  const departement = getDepartementByCode(parsed.data.departementCode);
  if (!departement) return { error: "Département inconnu." };

  const { year: annee } = await getContestSettings();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("concours_inscriptions")
    .delete()
    .eq("departement_code", departement.code)
    .eq("annee", annee);

  if (error) {
    console.error("clearInscriptions a échoué:", error.message);
    return { error: "Échec de la suppression." };
  }

  return { success: true };
}

const verifySchema = z.object({
  nom: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
});

export type VerifyCandidateInput = z.infer<typeof verifySchema>;
export type VerifyCandidateResult =
  { success: true; departementNom: string; whatsappUrl: string } | { error: string };

/**
 * Vérification publique "Je suis admis" (components/verification/
 * verification-form.tsx). Rate-limitée par IP. Message générique en cas de
 * non-correspondance — ne distingue jamais "email connu mais nom différent"
 * de "email inconnu", même logique de non-énumération que loginAdmin (voir
 * lib/actions/admin-auth.ts). Confirmer qu'un nom+email précis correspond à
 * un admis n'expose rien de plus sensible que /resultats (page publique) :
 * ce n'est pas un système d'authentification à protéger comme un mot de
 * passe, seulement une porte d'accès au lien WhatsApp du département.
 */
export async function verifyCandidate(
  input: VerifyCandidateInput
): Promise<VerifyCandidateResult> {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Merci de renseigner votre nom et un email valide." };
  }

  const ip = getClientIp(await headers());
  const verdict = await checkActionRateLimit(
    ip,
    "candidate_verification",
    VERIFICATION_RATE_LIMIT,
    VERIFICATION_RATE_LIMIT_WINDOW_SECONDS
  );
  if (verdict === "unavailable") {
    return { error: "Service temporairement indisponible. Réessayez plus tard." };
  }
  if (verdict === "denied") {
    return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
  }

  const genericError =
    "Aucune correspondance trouvée. Vérifiez votre nom et votre email, exactement comme utilisés lors de votre inscription au concours.";

  const settings = await getContestSettings();
  const match = await findInscription(settings.year, parsed.data.nom, parsed.data.email);
  if (!match) return { error: genericError };

  const departement = getDepartementByCode(match.departementCode);
  if (!departement) return { error: genericError };

  const whatsappUrl = settings.whatsappLinks[departement.code];
  if (!whatsappUrl) {
    return {
      error:
        "Votre inscription est confirmée, mais le lien du groupe WhatsApp de votre département n'est pas encore disponible. Réessayez bientôt.",
    };
  }

  // Best-effort : compteur anonyme pour le dashboard admin, ne doit jamais
  // empêcher de renvoyer le lien au candidat.
  try {
    const supabase = createServiceClient();
    await supabase.from("concours_verifications").insert({
      departement_code: departement.code,
      annee: settings.year,
    });
  } catch {
    // ignoré intentionnellement
  }

  return { success: true, departementNom: departement.nom, whatsappUrl };
}
