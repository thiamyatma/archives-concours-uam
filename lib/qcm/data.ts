import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { qcmMatiereSchema } from "@/lib/qcm/schema";
import type { QcmMatiere } from "@/lib/qcm/types";

/**
 * Chargement des grilles QCM (`content/qcm/<groupe>/<annee>/<matiere>.json`).
 * Même philosophie que lib/content/fs.ts : lecture disque au build/à la
 * demande, aucune base de données. `groupe` est le `contentGroup` du
 * département (lib/departements.ts) — contrairement aux archives Markdown,
 * un département n'a pas de dossier QCM propre : la grille est partagée par
 * tous les départements d'un même groupe, il n'y a pas de notion d'override.
 */

const CONTENT_ROOT = path.join(process.cwd(), "content", "qcm");

/** Grille QCM résolue et validée pour (groupe, année, matière), ou `null` si absente. */
export const getQcmMatiere = cache(
  (groupe: string, annee: number, matiereSlug: string): QcmMatiere | null => {
    const filePath = path.join(
      CONTENT_ROOT,
      groupe,
      String(annee),
      `${matiereSlug}.json`
    );
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, "utf-8");
    return qcmMatiereSchema.parse(JSON.parse(raw));
  }
);

/** Années disponibles pour un groupe de contenu, en scannant `content/qcm/<groupe>/`. */
export const listQcmAnnees = cache((groupe: string): number[] => {
  const dir = path.join(CONTENT_ROOT, groupe);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name))
    .map((entry) => Number(entry.name));
});

/** Slugs de matière disponibles pour (groupe, année), triés alphabétiquement. */
export const listQcmMatieres = cache((groupe: string, annee: number): string[] => {
  const dir = path.join(CONTENT_ROOT, groupe, String(annee));
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""))
    .sort();
});
