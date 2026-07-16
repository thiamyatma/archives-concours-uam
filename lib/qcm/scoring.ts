import type { Difficulte, Lettre, QcmQuestion, QcmResume } from "@/lib/qcm/types";

/**
 * Moteur de correction, exécuté côté client une fois que le candidat clique
 * sur « Voir ma correction » (jamais avant : voir components/qcm/qcm-runner.tsx).
 * Pure fonction de (questions, réponses du candidat) → questions corrigées +
 * bilan, aucun état, aucune E/S — facile à tester et à ré-exécuter si le
 * candidat modifie une réponse et relance la correction.
 */

export interface QcmCorrectedQuestion extends QcmQuestion {
  reponse_candidat: Lettre | null;
  resultat: "Correct" | "Incorrect" | null;
}

export interface QcmResult {
  questions: QcmCorrectedQuestion[];
  resume: QcmResume;
}

const NIVEAUX: { seuil: number; label: string }[] = [
  { seuil: 90, label: "Excellent" },
  { seuil: 80, label: "Très bon" },
  { seuil: 70, label: "Bon" },
  { seuil: 50, label: "Moyen" },
  { seuil: 0, label: "À renforcer" },
];

function niveauPour(pourcentage: number): string {
  return NIVEAUX.find((n) => pourcentage >= n.seuil)?.label ?? "À renforcer";
}

function commentairePour(niveau: string, matiere: string): string {
  switch (niveau) {
    case "Excellent":
      return `Excellente maîtrise de ${matiere} : ce niveau est solide pour aborder le concours sereinement. Continue à t'entraîner pour le garder.`;
    case "Très bon":
      return `Très bon niveau en ${matiere}. Quelques révisions ciblées sur les points manqués suffiront pour viser l'excellence.`;
    case "Bon":
      return `Bon niveau général en ${matiere}, mais des lacunes subsistent sur certains chapitres. Une révision méthodique des points ci-dessous fera la différence.`;
    case "Moyen":
      return `Niveau moyen en ${matiere} : les bases sont là, mais un travail de fond est nécessaire sur plusieurs chapitres avant le concours.`;
    default:
      return `Ce résultat en ${matiere} signale d'importantes lacunes à combler. Reprends les chapitres ci-dessous en priorité avant de retenter le QCM.`;
  }
}

const DIFFICULTE_POIDS: Record<Difficulte, number> = {
  Facile: 1,
  Moyenne: 2,
  Difficile: 3,
};

/** Chapitres à revoir, triés par poids d'erreur décroissant (une question ratée
 * de difficulté « Difficile » pèse plus qu'une question « Facile ») puis par
 * ordre alphabétique à égalité — déterministe pour les tests. */
function chapitresARevoir(questionsIncorrectes: QcmQuestion[]): string[] {
  const poidsParConcept = new Map<string, number>();
  for (const q of questionsIncorrectes) {
    poidsParConcept.set(
      q.concept,
      (poidsParConcept.get(q.concept) ?? 0) + DIFFICULTE_POIDS[q.difficulte]
    );
  }
  return Array.from(poidsParConcept.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([concept]) => concept);
}

export function corrigerQcm(
  matiere: string,
  questions: QcmQuestion[],
  reponsesCandidat: ReadonlyMap<number, Lettre>
): QcmResult {
  const questionsIncorrectes: QcmQuestion[] = [];
  let nombreCorrect = 0;

  const corrigees: QcmCorrectedQuestion[] = questions.map((q) => {
    const reponse = reponsesCandidat.get(q.numero) ?? null;
    const estCorrect = reponse !== null && reponse === q.bonne_reponse;
    if (estCorrect) nombreCorrect += 1;
    else questionsIncorrectes.push(q);

    return {
      ...q,
      reponse_candidat: reponse,
      resultat: reponse === null ? null : estCorrect ? "Correct" : "Incorrect",
    };
  });

  const pourcentage = Math.round((nombreCorrect / questions.length) * 100);
  const niveau = niveauPour(pourcentage);

  return {
    questions: corrigees,
    resume: {
      score: nombreCorrect,
      pourcentage,
      niveau,
      commentaire: commentairePour(niveau, matiere),
      chapitres_a_revoir: chapitresARevoir(questionsIncorrectes),
    },
  };
}
