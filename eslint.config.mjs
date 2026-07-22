import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  {
    rules: {
      // Garde-fou egress (voir docs/best-practices/supabase-performance.md) :
      // `select("*")` transfère des colonnes inutiles et grossit avec le
      // schéma. La forme COUNT `select("*", { count, head: true })` reste
      // autorisée — elle ne renvoie aucune ligne, donc aucun octet de données
      // — d'où le filtre sur `arguments.length=1`.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'CallExpression[callee.property.name="select"][arguments.length=1] > Literal[value="*"]',
          message:
            'Pas de select("*") : lister explicitement les colonnes nécessaires (egress). La forme COUNT select("*", { count, head: true }) reste autorisée.',
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "supabase/migrations/**",
  ]),
]);

export default eslintConfig;
