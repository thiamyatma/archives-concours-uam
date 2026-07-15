// Plage Unicode des signes diacritiques combinants (accents détachés après
// normalisation NFD) — écrite en séquences d'échappement explicites pour
// éviter d'avoir des caractères combinants littéraux dans le code source.
const COMBINING_MARKS_RE = new RegExp(
  String.fromCharCode(0x5b, 0x300, 0x2d, 0x36f, 0x5d),
  "g"
);

/**
 * Nom de fichier -> slug sûr pour un chemin Supabase Storage : accents
 * retirés, minuscules, uniquement `[a-z0-9-]`, tirets collapsés/coupés.
 * L'extension d'origine est ignorée (le `.pdf` est toujours rajouté par
 * l'appelant) puisque le bucket n'accepte que des PDF.
 */
export function slugifyFileName(name: string): string {
  const withoutExtension = name.replace(/\.[^.]+$/, "");
  const slug = withoutExtension
    .normalize("NFD")
    .replace(COMBINING_MARKS_RE, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "document";
}

/**
 * Chemin de stockage d'un document : `<départements-triés-joints>/<année>/<slug>.pdf`.
 * Les codes sont triés + joints par `-` pour que le chemin reste stable
 * quel que soit l'ordre de sélection à l'import (ex. toujours
 * "dgae-dsti-dstaan", jamais "dsti-dgae-dstaan" pour la même sélection).
 */
export function buildDocumentStoragePath(
  departementCodes: string[],
  annee: number,
  originalFileName: string
): string {
  const prefix = [...departementCodes].sort().join("-");
  const slug = slugifyFileName(originalFileName);
  return `${prefix}/${annee}/${slug}.pdf`;
}
