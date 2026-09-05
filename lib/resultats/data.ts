import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { DEPARTEMENTS } from "@/lib/departements";
import { resultatDepartementSchema } from "@/lib/resultats/schema";
import type { ResultatDepartement } from "@/lib/resultats/types";

/**
 * Chargement des résultats du concours (`content/resultats/<année>/<code
 * département>.json`), sur le même principe que lib/qcm/data.ts : lecture
 * disque à la demande, aucune base de données. Le fichier `_TEMPLATE.json`
 * (placé directement sous content/resultats/, hors de tout dossier
 * d'année) sert de modèle et n'est jamais chargé par ces fonctions.
 */

const CONTENT_ROOT = path.join(process.cwd(), "content", "resultats");

/** Résultats d'un département pour une année, ou `null` si pas encore publiés. */
export const getResultatsDepartement = cache(
  (departementCode: string, annee: number): ResultatDepartement | null => {
    const filePath = path.join(CONTENT_ROOT, String(annee), `${departementCode}.json`);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = resultatDepartementSchema.parse(JSON.parse(raw));
    return { departementCode, annee, admis: parsed.admis };
  }
);

/** Résultats de TOUS les départements pour une année (un seul par département ayant un fichier). */
export const getResultatsPourAnnee = cache((annee: number): ResultatDepartement[] => {
  return DEPARTEMENTS.map((dep) => getResultatsDepartement(dep.code, annee)).filter(
    (r): r is ResultatDepartement => r !== null
  );
});

/** Années pour lesquelles au moins un fichier de résultats existe (triées desc). */
export const listResultatsAnnees = cache((): number[] => {
  if (!fs.existsSync(CONTENT_ROOT)) return [];

  return fs
    .readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name))
    .map((entry) => Number(entry.name))
    .sort((a, b) => b - a);
});
