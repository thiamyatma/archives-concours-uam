import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { qcmMatiereSchema } from "@/lib/qcm/schema";

/**
 * Valide tous les fichiers `content/qcm/**\/*.json` écrits à la main :
 * conformité au schéma (lib/qcm/schema.ts) et cohérence des numéros de
 * question. N'importe pas lib/qcm/data.ts (`server-only`) — ce test lit
 * directement les fichiers, comme le ferait le loader au runtime.
 */

const CONTENT_ROOT = path.join(process.cwd(), "content", "qcm");

function findJsonFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findJsonFiles(full);
    return entry.name.endsWith(".json") ? [full] : [];
  });
}

const files = findJsonFiles(CONTENT_ROOT);

/**
 * Doublons connus et volontairement conservés tels quels dans le contenu
 * source (voir leur `justification` dans le JSON, qui signale le défaut au
 * candidat) plutôt que corrigés silencieusement, ce qui trahirait l'énoncé
 * réel de l'épreuve. Toute nouvelle question dupliquée hors de cette liste
 * doit continuer à faire échouer le test.
 */
const DOUBLONS_CONNUS = new Set([
  "dgo-du2adt/2024/mathematiques.json#38",
  "dsti-dgae-dstaan/2024/mathematiques.json#21",
  "dsti-dgae-dstaan/2024/physique-chimie.json#9",
]);

describe("content/qcm/**/*.json", () => {
  it("a trouvé les 16 fichiers attendus (4 groupes×années × 4 matières)", () => {
    expect(files.length).toBe(16);
  });

  it.each(files.map((f) => [path.relative(CONTENT_ROOT, f), f] as const))(
    "%s est conforme au schéma QCM",
    (_label, filePath) => {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const result = qcmMatiereSchema.safeParse(raw);
      expect(result.error?.message ?? "").toBe("");
      expect(result.success).toBe(true);
    }
  );

  it.each(
    files.map(
      (f) => [path.relative(CONTENT_ROOT, f).split(path.sep).join("/"), f] as const
    )
  )(
    "%s a des numéros de question consécutifs et 4 propositions distinctes par question",
    (label, filePath) => {
      const data = qcmMatiereSchema.parse(JSON.parse(fs.readFileSync(filePath, "utf-8")));
      const numeros = data.questions.map((q) => q.numero);
      for (let i = 1; i < numeros.length; i++) {
        expect(numeros[i]).toBe(numeros[i - 1] + 1);
      }
      for (const q of data.questions) {
        if (DOUBLONS_CONNUS.has(`${label}#${q.numero}`)) continue;
        const options = Object.values(q.propositions);
        expect(new Set(options).size).toBe(options.length);
      }
    }
  );
});
