/**
 * Types du domaine "résultats du concours" (liste des candidats admis par
 * département — voir docs/resultats-concours.md). Même philosophie que
 * lib/qcm/types.ts : contenu git-versionné (content/resultats/**), aucune
 * base de données.
 */

export interface ResultatCandidat {
  nom: string;
  filiere?: string;
  dateNaissance?: string;
}

export interface ResultatDepartement {
  departementCode: string;
  annee: number;
  admis: ResultatCandidat[];
}
