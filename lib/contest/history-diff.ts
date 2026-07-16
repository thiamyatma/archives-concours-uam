import type { ContestSettings } from "@/lib/contest/types";

/**
 * Logique pure de calcul de diff (aucun accès DB — voir lib/contest/history.ts
 * pour la persistance). Séparée dans son propre fichier, sans `server-only`,
 * pour rester testable unitairement (même principe que status.ts/schema.ts
 * vs settings.ts).
 */

export interface ContestSettingsChange {
  fieldPath: string;
  oldValue: string | null;
  newValue: string | null;
}

/** Sérialise une valeur de champ pour l'historique (lisible, comparable). */
function serialize(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/** Aplatit un objet en dot-paths jusqu'aux valeurs scalaires/Date. */
function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      value !== null &&
      typeof value === "object" &&
      !(value instanceof Date) &&
      !Array.isArray(value)
    ) {
      Object.assign(out, flatten(value as Record<string, unknown>, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

/**
 * Calcule les champs qui diffèrent entre deux états de `ContestSettings`
 * (aplatis en dot-paths, ex. `messages.duringRegistration`). Utilisé par
 * `updateContestSettings` pour n'enregistrer dans l'historique que ce qui a
 * réellement changé.
 */
export function diffContestSettings(
  before: ContestSettings,
  after: ContestSettings
): ContestSettingsChange[] {
  const beforeFlat = flatten(before as unknown as Record<string, unknown>);
  const afterFlat = flatten(after as unknown as Record<string, unknown>);
  const paths = new Set([...Object.keys(beforeFlat), ...Object.keys(afterFlat)]);

  const changes: ContestSettingsChange[] = [];
  for (const path of paths) {
    const oldValue = serialize(beforeFlat[path]);
    const newValue = serialize(afterFlat[path]);
    if (oldValue !== newValue) {
      changes.push({ fieldPath: path, oldValue, newValue });
    }
  }
  return changes;
}
