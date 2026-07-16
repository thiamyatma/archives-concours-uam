"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminSession } from "@/lib/actions/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { contestSettingsSchema, type ContestSettingsInput } from "@/lib/contest/schema";
import { CONTEST_SETTINGS_TAG } from "@/lib/contest/settings";

/**
 * Enregistre les paramètres du concours (singleton). Admin uniquement,
 * validation Zod côté serveur (section 12). Revalide le cache des paramètres
 * (tag) + la page d'accueil + la page admin.
 */
export async function updateContestSettings(
  input: ContestSettingsInput
): Promise<{ success: true } | { error: string }> {
  await requireAdminSession();

  const parsed = contestSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Données invalides. Vérifiez les champs." };
  }
  const s = parsed.data;

  const supabase = createServiceClient();
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
  });

  if (error) {
    console.error("updateContestSettings a échoué:", error.message);
    return { error: "Échec de l'enregistrement." };
  }

  revalidateTag(CONTEST_SETTINGS_TAG);
  revalidatePath("/");
  revalidatePath("/admin/parametres");
  return { success: true };
}
