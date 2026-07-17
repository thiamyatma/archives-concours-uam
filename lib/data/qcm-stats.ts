import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Total des corrections QCM générées (`qcm_attempts`), affiché sur le
 * dashboard admin — même défensivité que getExamPageViewsTotal (repli sur 0
 * si Supabase est indisponible, jamais d'erreur remontée à la page).
 */
export async function getQcmAttemptsTotal(): Promise<number> {
  try {
    const supabase = createServiceClient();
    const { count, error } = await supabase
      .from("qcm_attempts")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("getQcmAttemptsTotal a échoué:", error.message);
      return 0;
    }
    return count ?? 0;
  } catch (error) {
    console.error("getQcmAttemptsTotal a échoué:", error);
    return 0;
  }
}
