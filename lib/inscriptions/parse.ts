/**
 * Parsing du texte collé par l'admin dans le formulaire d'import des
 * inscriptions (voir components/admin/inscriptions-import-form.tsx). Pure
 * fonction, aucune E/S — testée unitairement (voir parse.test.ts).
 *
 * Formats acceptés : "nom,date de naissance" pour un département sélectionné,
 * ou le CSV complet "département,filière,nom,prénom,date de naissance".
 */

export interface ParsedInscriptionRow {
  nom: string;
  dateNaissance: string;
  filiere?: string;
  departementCode?: string;
}

export interface ParseInscriptionsResult {
  rows: ParsedInscriptionRow[];
  /** Erreurs par ligne (numérotées à partir de 1) — n'interrompent pas le parsing des autres lignes. */
  errors: string[];
}

const DATE_RE = /^\d{2}[/-]\d{2}[/-]\d{4}$/;

// Étiquettes de colonne courantes pour détecter l'en-tête du CSV complet.
const HEADER_TOKENS = new Set([
  "nom",
  "département",
  "departement",
  "filière",
  "filiere",
  "prénom",
  "prenom",
  "date de naissance",
]);

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
      errors.push(
        `Ligne ${lineNumber} : format invalide (attendu "nom,date de naissance").`
      );
      return;
    }

    if (lineNumber === 1 && parts.some((part) => HEADER_TOKENS.has(part.toLowerCase()))) {
      return;
    }

    const isCompleteRow = parts.length >= 5;
    const departementCode = isCompleteRow ? parts[0] : undefined;
    const filiere = isCompleteRow ? parts[1] : undefined;
    const nom = isCompleteRow ? `${parts[2]} ${parts[3]}`.trim() : parts[0];
    const dateNaissance = isCompleteRow ? parts[4] : parts[1];

    if (!nom || (isCompleteRow && (!departementCode || !filiere))) {
      errors.push(`Ligne ${lineNumber} : nom manquant.`);
      return;
    }
    if (!DATE_RE.test(dateNaissance)) {
      errors.push(
        `Ligne ${lineNumber} : date de naissance invalide ("${dateNaissance}").`
      );
      return;
    }

    rows.push({ nom, dateNaissance, filiere, departementCode });
  });

  return { rows, errors };
}
