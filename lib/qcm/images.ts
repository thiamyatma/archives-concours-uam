import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Certaines questions de logique renvoient à une image plutôt qu'à du texte
 * (`content/archives/**` utilise déjà `/archives/<groupe>/<annee>/q<numero>.jpg`
 * pour ces mêmes questions — voir docs/ARCHITECTURE.md). Le JSON QCM ne stocke
 * pas ce chemin (il n'apparaît pas dans le schéma demandé) : on le déduit ici
 * en vérifiant simplement l'existence du fichier.
 */
export function getQuestionImageUrl(
  groupe: string,
  annee: number,
  numero: number
): string | null {
  const relative = `${groupe}/${annee}/q${numero}.jpg`;
  const filePath = path.join(process.cwd(), "public", "archives", relative);
  return fs.existsSync(filePath) ? `/archives/${relative}` : null;
}
