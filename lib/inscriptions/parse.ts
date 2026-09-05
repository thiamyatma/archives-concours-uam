/**
 * Parsing du texte collé par l'admin dans le formulaire d'import des
 * inscriptions (voir components/admin/inscriptions-import-form.tsx). Pure
 * fonction, aucune E/S — testée unitairement (voir parse.test.ts).
 *
 * Format attendu : une ligne par candidat, "nom,email" — virgule,
 * point-virgule ou tabulation acceptés comme séparateur (les exports Excel
 * français utilisent souvent le point-virgule ; le presse-papier depuis un
 * tableur colle des tabulations). Une éventuelle ligne d'en-tête ("nom,
 * email") est détectée et ignorée silencieusement.
 */

export interface ParsedInscriptionRow {
  nom: string;
  email: string;
}

export interface ParseInscriptionsResult {
  rows: ParsedInscriptionRow[];
  /** Erreurs par ligne (numérotées à partir de 1) — n'interrompent pas le parsing des autres lignes. */
  errors: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Étiquettes de colonne courantes, pour détecter une ligne d'en-tête sans
// dépendre de "l'email est invalide" (une vraie 1re ligne de données avec
// un email mal saisi serait alors silencieusement ignorée au lieu d'être
// signalée en erreur — piège vérifié par un test dédié).
const HEADER_TOKENS = new Set([
  "nom",
  "name",
  "email",
  "mail",
  "e-mail",
  "adresse email",
  "adresse mail",
]);

function looksLikeHeaderRow(nom: string, email: string): boolean {
  return HEADER_TOKENS.has(nom.toLowerCase()) || HEADER_TOKENS.has(email.toLowerCase());
}

export function parseInscriptionsInput(text: string): ParseInscriptionsResult {
  const rows: ParsedInscriptionRow[] = [];
  const errors: string[] = [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const parts = line.split(/[,;\t]/).map((p) => p.trim());

    if (parts.length < 2) {
      errors.push(`Ligne ${lineNumber} : format invalide (attendu "nom,email").`);
      return;
    }

    const [nom, email] = parts;

    // Ligne d'en-tête probable ("nom,email") : seulement en première
    // position, et seulement si les cellules ressemblent à des étiquettes.
    if (lineNumber === 1 && looksLikeHeaderRow(nom, email)) return;

    if (!nom) {
      errors.push(`Ligne ${lineNumber} : nom manquant.`);
      return;
    }
    if (!EMAIL_RE.test(email)) {
      errors.push(`Ligne ${lineNumber} : email invalide ("${email}").`);
      return;
    }

    rows.push({ nom, email });
  });

  return { rows, errors };
}
