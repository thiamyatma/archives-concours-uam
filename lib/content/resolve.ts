import type { Departement } from "@/lib/departements";

/** Dédoublonne puis trie décroissant — un an peut exister à la fois en propre et en partagé. */
export function mergeAndSortYears(own: number[], shared: number[]): number[] {
  return Array.from(new Set([...own, ...shared])).sort((a, b) => b - a);
}

/**
 * Dossiers candidats pour un (département, année), dans l'ordre de
 * priorité : propre au département d'abord (permet une divergence future
 * sans changement de code), puis groupe partagé. Pas de doublon quand le
 * département n'a pas de groupe distinct (contentGroup === code).
 */
export function candidateContentPaths(
  dep: Pick<Departement, "code" | "contentGroup">
): string[] {
  if (dep.contentGroup === dep.code) return [dep.code];
  return [dep.code, dep.contentGroup];
}
