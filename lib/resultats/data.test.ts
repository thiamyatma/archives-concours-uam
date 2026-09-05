import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resultatDepartementSchema } from "@/lib/resultats/schema";
import { DEPARTEMENTS } from "@/lib/departements";

/**
 * Valide tous les fichiers `content/resultats/<année>/<département>.json`
 * écrits à la main : conformité au schéma (lib/resultats/schema.ts) et code
 * département reconnu. N'importe pas lib/resultats/data.ts (`server-only`)
 * — ce test lit directement les fichiers, comme le ferait le loader.
 */

const CONTENT_ROOT = path.join(process.cwd(), "content", "resultats");
const DEPARTEMENT_CODES = new Set(DEPARTEMENTS.map((d) => d.code));

interface ResultatFile {
  annee: string;
  code: string;
  filePath: string;
}

function findResultatFiles(): ResultatFile[] {
  if (!fs.existsSync(CONTENT_ROOT)) return [];

  return fs
    .readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name))
    .flatMap((yearDir) => {
      const yearPath = path.join(CONTENT_ROOT, yearDir.name);
      return fs
        .readdirSync(yearPath)
        .filter((file) => file.endsWith(".json"))
        .map((file) => ({
          annee: yearDir.name,
          code: file.replace(/\.json$/, ""),
          filePath: path.join(yearPath, file),
        }));
    });
}

const files = findResultatFiles();

describe("content/resultats/**/*.json", () => {
  it.each(files)(
    "$annee/$code.json est valide et le département est reconnu",
    ({ code, filePath }) => {
      expect(DEPARTEMENT_CODES.has(code)).toBe(true);

      const raw = fs.readFileSync(filePath, "utf-8");
      const result = resultatDepartementSchema.safeParse(JSON.parse(raw));
      expect(result.success).toBe(true);
    }
  );

  it("le modèle _TEMPLATE.json n'est pas lu comme un fichier de résultats", () => {
    const templatePath = path.join(CONTENT_ROOT, "_TEMPLATE.json");
    if (fs.existsSync(templatePath)) {
      expect(fs.statSync(templatePath).isDirectory()).toBe(false);
    }
    // Aucun dossier "_TEMPLATE" ne doit avoir été scanné comme une année.
    expect(files.some((f) => f.annee === "_TEMPLATE")).toBe(false);
  });
});
