import "server-only";
import { cache } from "react";
import { DEPARTEMENTS, getDepartementByCode } from "@/lib/departements";
import { listAnneesForDepartement, resolveContentSource } from "@/lib/content/fs";
import { repairLatexEscapes } from "@/lib/content/repair-latex";
import { insertHardLineBreaksForListContinuations } from "@/lib/content/normalize-qcm";
import { parseConcoursMarkdown, type ParsedContent } from "@/lib/content/parse";
import { aggregateManifest, type ContentManifest } from "@/lib/content/manifest";

export { DEPARTEMENTS, getDepartementByCode };

/** Années disponibles pour un département (propres + partagées, dédoublonnées, triées desc). */
export const getDepartementAnnees = cache((code: string): number[] => {
  const dep = getDepartementByCode(code);
  if (!dep) return [];
  return listAnneesForDepartement(dep);
});

/** Contenu résolu et prêt à afficher pour un (département, année), ou `null` si introuvable. */
export const getConcoursContent = cache(
  (code: string, annee: number): ParsedContent | null => {
    const dep = getDepartementByCode(code);
    if (!dep) return null;

    const raw = resolveContentSource(dep, annee);
    if (raw === null) return null;

    const repaired = repairLatexEscapes(raw);
    const normalized = insertHardLineBreaksForListContinuations(repaired);
    return parseConcoursMarkdown(normalized);
  }
);

export const getContentManifest = cache((): ContentManifest => {
  const entries = DEPARTEMENTS.map((dep) => ({
    code: dep.code,
    nom: dep.nom,
    description: dep.description,
    annees: listAnneesForDepartement(dep),
  }));
  return aggregateManifest(entries);
});
