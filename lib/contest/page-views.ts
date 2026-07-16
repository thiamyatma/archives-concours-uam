import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Total des vues de pages épreuve (`exam_document_views`), affiché comme
 * « Vues des épreuves » sur la page d'accueil (toggle admin). Il n'existe pas
 * de compteur de visites site-wide (Google Analytics est côté client
 * uniquement) — ce nombre est le proxy réel le plus proche déjà en base.
 */
export async function getExamPageViewsTotal(): Promise<number> {
  try {
    const supabase = createServiceClient();
    const { count, error } = await supabase
      .from("exam_document_views")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("getExamPageViewsTotal a échoué:", error.message);
      return 0;
    }
    return count ?? 0;
  } catch (error) {
    console.error("getExamPageViewsTotal a échoué:", error);
    return 0;
  }
}
