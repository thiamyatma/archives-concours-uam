"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminSession } from "@/lib/actions/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  contestSettingsSchema,
  describeValidationError,
  type ContestSettingsInput,
} from "@/lib/contest/schema";
import { CONTEST_SETTINGS_TAG, getContestSettings } from "@/lib/contest/settings";
import { diffContestSettings } from "@/lib/contest/history-diff";
import { recordContestSettingsHistory } from "@/lib/contest/history";

/**
 * Enregistre les paramètres du concours (singleton). Admin uniquement,
 * validation Zod côté serveur (section 12). Consigne un historique
 * field-level (voir lib/contest/history.ts) avant d'écraser la ligne.
 * Revalide le cache des paramètres (tag) + la page d'accueil + la page admin.
 */
export async function updateContestSettings(
  input: ContestSettingsInput
): Promise<{ success: true } | { error: string }> {
  const { adminId } = await requireAdminSession();

  const parsed = contestSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: `Données invalides — ${describeValidationError(parsed.error, input)}`,
    };
  }
  const s = parsed.data;

  const supabase = createServiceClient();

  // Snapshot AVANT écriture, pour l'historique. `getContestSettings` est
  // caché : on ignore le cache ici volontairement (une lecture directe,
  // admin-only, peu fréquente) pour comparer contre l'état réellement en
  // base, pas une valeur potentiellement périmée.
  const before = await getContestSettings();

  const { error } = await supabase.from("contest_settings").upsert({
    id: true,
    year: s.year,
    official_name: s.officialName,
    subtitle: s.subtitle,
    description: s.description,
    registration_opens_at: s.registrationOpensAt?.toISOString() ?? null,
    registration_closes_at: s.registrationClosesAt?.toISOString() ?? null,
    contest_date: s.contestDate?.toISOString() ?? null,
    results_date: s.resultsDate?.toISOString() ?? null,
    messages: s.messages,
    banner: s.banner,
    countdown: s.countdown,
    buttons: s.buttons,
    info: s.info,
    seo: s.seo,
    stats: s.stats,
    partner: s.partner,
  });

  if (error) {
    console.error("updateContestSettings a échoué:", error.message);
    return { error: "Échec de l'enregistrement." };
  }

  const changes = diffContestSettings(before, s);
  if (changes.length > 0) {
    const { data: admin } = await supabase
      .from("admin_users")
      .select("email")
      .eq("id", adminId)
      .maybeSingle();
    await recordContestSettingsHistory(admin?.email ?? "inconnu", changes);
  }

  revalidateTag(CONTEST_SETTINGS_TAG);
  // `{ type: "layout" }` : le widget flottant (ContestFloatingWidget) et la
  // bannière vivent dans app/layout.tsx, partagé par TOUTES les pages —
  // revalider uniquement "/" (type par défaut "page") laisse le HTML statique
  // des autres routes (ex. /departements) périmé malgré revalidateTag.
  revalidatePath("/", "layout");
  revalidatePath("/admin/parametres");
  return { success: true };
}
