/**
 * Dérive le slug de matière (`mathematiques`, `physique-chimie`, ...) utilisé
 * pour nommer les fichiers `content/qcm/<groupe>/<annee>/<matiere>.json` à
 * partir du titre de section brut du Markdown (`ÉPREUVE DE MATHÉMATIQUES`,
 * voir lib/content/parse.ts). Générique plutôt qu'une table figée : toute
 * nouvelle matière ajoutée aux archives obtient son slug sans changement de
 * code ici.
 */
export function slugifyMatiereTitle(title: string): string {
  const sansPrefixe = title.replace(/^ÉPREUVE\s+(DE|D['’])\s*/iu, "");
  return sansPrefixe
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
