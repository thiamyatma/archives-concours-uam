/**
 * Normalisation de texte partagée pour toute comparaison insensible à la
 * casse et aux accents (recherche d'un candidat admis — lib/resultats/
 * search.ts —, vérification d'inscription — lib/inscriptions/data.ts).
 * Isolée ici (plutôt que dupliquée) car les deux domaines en ont besoin
 * indépendamment l'un de l'autre.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
