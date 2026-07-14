import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Departement } from "@/lib/departements";
import { candidateContentPaths, mergeAndSortYears } from "@/lib/content/resolve";

const CONTENT_ROOT = path.join(process.cwd(), "content", "archives");

const YEAR_FILE_RE = /^(\d{4})\.md$/;

/** Années disponibles (fichiers `<année>.md`) dans un sous-dossier de content/archives. */
function listMarkdownYears(dirRelative: string): number[] {
  const dir = path.join(CONTENT_ROOT, dirRelative);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .map((fileName) => YEAR_FILE_RE.exec(fileName)?.[1])
    .filter((year): year is string => year !== undefined)
    .map(Number);
}

/** Contenu brut d'un fichier `<dirRelative>/<année>.md`, ou `null` s'il n'existe pas. */
function readMarkdownFile(dirRelative: string, annee: number): string | null {
  const filePath = path.join(CONTENT_ROOT, dirRelative, `${annee}.md`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

export function listAnneesForDepartement(
  dep: Pick<Departement, "code" | "contentGroup">
): number[] {
  const [ownDir, sharedDir] = candidateContentPaths(dep);
  const own = listMarkdownYears(ownDir);
  const shared = sharedDir ? listMarkdownYears(sharedDir) : [];
  return mergeAndSortYears(own, shared);
}

/** Contenu brut résolu pour un (département, année), ou `null` si aucun fichier ne correspond. */
export function resolveContentSource(
  dep: Pick<Departement, "code" | "contentGroup">,
  annee: number
): string | null {
  for (const dir of candidateContentPaths(dep)) {
    const raw = readMarkdownFile(dir, annee);
    if (raw !== null) return raw;
  }
  return null;
}
