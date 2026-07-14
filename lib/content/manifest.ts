export interface DepartementManifestEntry {
  code: string;
  nom: string;
  description: string;
  annees: number[];
}

export interface ContentManifest {
  departements: DepartementManifestEntry[];
  totalDepartements: number;
  /** Somme des années par département (une épreuve partagée par 3 départements compte 3 fois : autant d'URLs navigables réelles). */
  totalSessions: number;
  /** Année littérale la plus récente parmi tous les départements (pas un mtime fichier, non fiable après un `git clone`). */
  latestAnnee: number | null;
}

export function aggregateManifest(
  departements: DepartementManifestEntry[]
): ContentManifest {
  const totalSessions = departements.reduce((sum, d) => sum + d.annees.length, 0);
  const allAnnees = departements.flatMap((d) => d.annees);
  const latestAnnee = allAnnees.length > 0 ? Math.max(...allAnnees) : null;

  return {
    departements,
    totalDepartements: departements.length,
    totalSessions,
    latestAnnee,
  };
}
