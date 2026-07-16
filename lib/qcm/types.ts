/**
 * Types du domaine « entraînement QCM ». Une matière (`content/qcm/<groupe>/
 * <annee>/<matiere>.json`) fournit la grille de correction complète : la
 * bonne réponse de chaque question est connue dès le chargement, mais ne
 * doit être révélée au candidat qu'après soumission (voir
 * components/qcm/qcm-runner.tsx). `reponse_candidat` et `resultat` sont
 * `null` dans les fichiers sources — ils ne sont remplis que côté client,
 * pendant la session de l'utilisateur, jamais persistés.
 */

export type Lettre = "A" | "B" | "C" | "D";

export type Difficulte = "Facile" | "Moyenne" | "Difficile";

export interface QcmPropositions {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface QcmQuestion {
  numero: number;
  question: string;
  propositions: QcmPropositions;
  bonne_reponse: Lettre;
  reponse_candidat: Lettre | null;
  resultat: "Correct" | "Incorrect" | null;
  justification: string;
  concept: string;
  difficulte: Difficulte;
}

export interface QcmResume {
  score: number | null;
  pourcentage: number | null;
  niveau: string | null;
  commentaire: string | null;
  chapitres_a_revoir: string[] | null;
}

export interface QcmMatiere {
  matiere: string;
  nombre_questions: number;
  questions: QcmQuestion[];
  resume: QcmResume;
}
