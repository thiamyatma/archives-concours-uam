import { DEPARTEMENTS } from "@/lib/departements";

/**
 * Libellés d'affichage du tableau de bord Analytics QCM. Les données stockent
 * des slugs (`mathematiques`) et des codes département (`dsti`) ; l'UI affiche
 * des noms lisibles. Pur et sans dépendance serveur (utilisable côté client).
 */

const MATIERE_LABELS: Record<string, string> = {
  francais: "Français",
  mathematiques: "Mathématiques",
  "physique-chimie": "Physique-Chimie",
  anglais: "Anglais",
  logique: "Logique",
};

export function matiereLabel(slug: string): string {
  return (
    MATIERE_LABELS[slug] ??
    slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ")
  );
}

const DEPARTEMENT_LABELS: Record<string, string> = Object.fromEntries(
  DEPARTEMENTS.map((d) => [d.code, d.nom])
);

export function departementLabel(code: string | null): string {
  if (!code) return "Non renseigné";
  return DEPARTEMENT_LABELS[code] ?? code.toUpperCase();
}

/** Durée en secondes -> « 4 min 05 s » / « 45 s ». */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds} s`;
  const min = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem === 0 ? `${min} min` : `${min} min ${String(rem).padStart(2, "0")} s`;
}
