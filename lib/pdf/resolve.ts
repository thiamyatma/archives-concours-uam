import type { Departement } from "@/lib/departements";
import { candidateContentPaths } from "@/lib/content/resolve";

/**
 * Chemin du PDF dans le bucket `exam-pdfs`, miroir exact de la convention
 * `content/archives/<dossier>/<année>.md` (voir lib/content/resolve.ts) :
 * override propre au département d'abord, groupe partagé ensuite.
 */
export function candidatePdfPaths(
  dep: Pick<Departement, "code" | "contentGroup">,
  annee: number
): string[] {
  return candidateContentPaths(dep).map((dir) => `${dir}/${annee}.pdf`);
}

/** Nom de fichier proposé au téléchargement, ex. `DSTI_2025.pdf`. */
export function buildDownloadFileName(departementCode: string, annee: number): string {
  return `${departementCode.toUpperCase()}_${annee}.pdf`;
}
