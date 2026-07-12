import { FILES_PER_COMPLETE_YEAR } from "@/lib/constants";
import type { DocumentMatiere, DocumentType } from "@/types/database";

export interface YearCompleteness {
  annee: number;
  count: number;
  total: number;
  isComplete: boolean;
}

interface MinimalDoc {
  annee: number;
  matiere: DocumentMatiere;
  type: DocumentType;
}

/**
 * Regroupe des documents approuvés par année et calcule, pour chacune,
 * combien de fichiers uniques (matière x type) sont présents sur les 8 attendus.
 * Un doublon (même matière + même type déposé deux fois) ne compte qu'une fois.
 */
export function computeYearCompleteness(docs: MinimalDoc[]): YearCompleteness[] {
  const byYear = new Map<number, Set<string>>();

  for (const doc of docs) {
    const key = `${doc.matiere}:${doc.type}`;
    const set = byYear.get(doc.annee) ?? new Set<string>();
    set.add(key);
    byYear.set(doc.annee, set);
  }

  return Array.from(byYear.entries())
    .map(([annee, set]) => ({
      annee,
      count: set.size,
      total: FILES_PER_COMPLETE_YEAR,
      isComplete: set.size >= FILES_PER_COMPLETE_YEAR,
    }))
    .sort((a, b) => b.annee - a.annee);
}
