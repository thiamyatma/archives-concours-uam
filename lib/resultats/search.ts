/**
 * Recherche d'un candidat admis (composants/resultats/resultats-search.tsx).
 * Pure fonction, aucune E/S — testée unitairement (voir search.test.ts).
 */

export interface SearchableCandidat {
  departementCode: string;
  nom: string;
  numero?: string;
}

/** Normalise un texte pour une comparaison insensible à la casse et aux accents. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Filtre les candidats dont le nom OU le numéro contient la requête
 * (sous-chaîne, insensible casse/accents). Requête vide → aucun résultat :
 * on ne veut jamais afficher la liste complète des admis comme "résultat de
 * recherche" par défaut.
 */
export function searchCandidats<T extends SearchableCandidat>(
  candidats: T[],
  query: string
): T[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length === 0) return [];

  return candidats.filter((candidat) => {
    if (normalizeSearchText(candidat.nom).includes(normalizedQuery)) return true;
    return candidat.numero
      ? normalizeSearchText(candidat.numero).includes(normalizedQuery)
      : false;
  });
}
