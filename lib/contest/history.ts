import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { ContestSettingsChange } from "@/lib/contest/history-diff";

export type { ContestSettingsChange } from "@/lib/contest/history-diff";
export { diffContestSettings } from "@/lib/contest/history-diff";

export interface ContestSettingsHistoryEntry extends ContestSettingsChange {
  id: string;
  changedAt: string;
  adminEmail: string;
}

/** Insère une ligne d'historique par champ modifié. Best-effort (ne bloque jamais l'enregistrement principal). */
export async function recordContestSettingsHistory(
  adminEmail: string,
  changes: ContestSettingsChange[]
): Promise<void> {
  if (changes.length === 0) return;

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("contest_settings_history").insert(
      changes.map((change) => ({
        admin_email: adminEmail,
        field_path: change.fieldPath,
        old_value: change.oldValue,
        new_value: change.newValue,
      }))
    );
    if (error) {
      console.error("recordContestSettingsHistory a échoué:", error.message);
    }
  } catch (error) {
    console.error("recordContestSettingsHistory a échoué:", error);
  }
}

const HISTORY_LIMIT = 50;

/** Dernières modifications, les plus récentes en premier. */
export async function getContestSettingsHistory(): Promise<
  ContestSettingsHistoryEntry[]
> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("contest_settings_history")
      .select("id, changed_at, admin_email, field_path, old_value, new_value")
      .order("changed_at", { ascending: false })
      .limit(HISTORY_LIMIT);

    if (error) {
      console.error("getContestSettingsHistory a échoué:", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      changedAt: row.changed_at,
      adminEmail: row.admin_email,
      fieldPath: row.field_path,
      oldValue: row.old_value,
      newValue: row.new_value,
    }));
  } catch (error) {
    console.error("getContestSettingsHistory a échoué:", error);
    return [];
  }
}
