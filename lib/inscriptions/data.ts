import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizeSearchText } from "@/lib/text/normalize";
import { DEPARTEMENTS } from "@/lib/departements";
import type { InscriptionsSummary } from "@/lib/inscriptions/types";

export interface InscriptionMatch {
  departementCode: string;
}

/**
 * Cherche un candidat inscrit correspondant EXACTEMENT (nom ET email,
 * normalisés — lib/text/normalize.ts) pour l'année donnée. Une seule
 * requête, les deux conditions dans le WHERE : ne jamais distinguer "email
 * connu mais nom différent" de "email inconnu" dans le résultat — même
 * logique de non-énumération que loginAdmin (lib/actions/admin-auth.ts).
 * Repli silencieux sur `null` si Supabase est indisponible (même posture
 * que lib/contest/settings.ts) — le rate-limit de l'appelant
 * (lib/actions/inscriptions.ts) reste, lui, honnête sur l'indisponibilité.
 */
export async function findInscription(
  annee: number,
  nom: string,
  email: string
): Promise<InscriptionMatch | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("concours_inscriptions")
      .select("departement_code")
      .eq("annee", annee)
      .eq("email_normalise", normalizeSearchText(email))
      .eq("nom_normalise", normalizeSearchText(nom))
      .maybeSingle();

    if (error || !data) return null;
    return { departementCode: data.departement_code };
  } catch {
    return null;
  }
}

/** Nombre d'inscriptions importées par département pour une année (dashboard admin). */
export async function getInscriptionsSummary(
  annee: number
): Promise<InscriptionsSummary[]> {
  const counts = new Map<string, number>();

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("concours_inscriptions")
      .select("departement_code")
      .eq("annee", annee);

    for (const row of data ?? []) {
      counts.set(row.departement_code, (counts.get(row.departement_code) ?? 0) + 1);
    }
  } catch {
    // Base indisponible : la page admin affiche 0 pour chaque département
    // plutôt que de planter.
  }

  return DEPARTEMENTS.map((d) => ({
    departementCode: d.code,
    count: counts.get(d.code) ?? 0,
  }));
}
