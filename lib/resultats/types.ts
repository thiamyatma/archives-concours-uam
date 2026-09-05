/**
 * Types du domaine "résultats du concours" (liste des candidats admis par
 * département — voir docs/resultats-concours.md). Même philosophie que
 * lib/qcm/types.ts : contenu git-versionné (content/resultats/**), aucune
 * base de données.
 */

export interface ResultatCandidat {
  nom: string;
  /** Numéro de table/matricule du candidat, si connu. Optionnel : certains
   * départements ne fournissent que des noms. */
  numero?: string;
}

export interface ResultatDepartement {
  departementCode: string;
  annee: number;
  admis: ResultatCandidat[];
}
