import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export interface DownloadStats {
  totalDownloads: number;
  totalFilesDownloaded: number;
  byDepartement: { departementCode: string; downloads: number }[];
  byAnnee: { annee: number; downloads: number }[];
  top: { departementCode: string; annee: number; fileName: string; downloads: number }[];
}

/**
 * Statistiques agrégées de téléchargement, calculées en base (RPC, même
 * esprit que `get_global_stats` — voir docs/PERFORMANCE.md). Service role
 * uniquement : jamais appelé depuis une page publique.
 *
 * Chacune des 4 RPC est traitée indépendamment : si une seule échoue, elle
 * retombe sur un résultat vide (avec un log), sans effacer les 3 autres qui
 * ont réussi — un dashboard partiellement rempli vaut mieux qu'un dashboard
 * entièrement à zéro pour une panne isolée.
 */
export async function getDownloadStats(): Promise<DownloadStats> {
  const supabase = createServiceClient();

  const [totals, byDepartement, byAnnee, top] = await Promise.all([
    supabase.rpc("get_pdf_download_stats"),
    supabase.rpc("get_pdf_downloads_by_departement"),
    supabase.rpc("get_pdf_downloads_by_annee"),
    supabase.rpc("get_top_downloaded_pdfs", { limit_count: 10 }),
  ]);

  if (totals.error) {
    console.error("get_pdf_download_stats a échoué:", totals.error.message);
  }
  if (byDepartement.error) {
    console.error(
      "get_pdf_downloads_by_departement a échoué:",
      byDepartement.error.message
    );
  }
  if (byAnnee.error) {
    console.error("get_pdf_downloads_by_annee a échoué:", byAnnee.error.message);
  }
  if (top.error) {
    console.error("get_top_downloaded_pdfs a échoué:", top.error.message);
  }

  const totalsRow = totals.data?.[0];

  return {
    totalDownloads: totalsRow?.total_downloads ?? 0,
    totalFilesDownloaded: totalsRow?.total_files_downloaded ?? 0,
    byDepartement: (byDepartement.data ?? []).map((r) => ({
      departementCode: r.departement_code,
      downloads: r.downloads,
    })),
    byAnnee: (byAnnee.data ?? []).map((r) => ({
      annee: r.annee,
      downloads: r.downloads,
    })),
    top: (top.data ?? []).map((r) => ({
      departementCode: r.departement_code,
      annee: r.annee,
      fileName: r.file_name,
      downloads: r.downloads,
    })),
  };
}
