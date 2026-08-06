import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Simple liste (pas de pagination) : le nombre d'années archivées par
 * département reste faible (une poignée), contrairement à l'ancienne
 * liste de filières qui pouvait accumuler des dizaines de documents.
 * Voir docs/PERFORMANCE.md.
 *
 * Server Component sans état : `annees` arrive déjà complète (Markdown +
 * années PDF-seul, fusionnées côté serveur dans la page). L'ancien
 * complément « au montage » coûtait deux requêtes Supabase à chaque visite,
 * robots compris, pour une valeur identique pour tout le monde.
 */
export function DepartementYearsList({
  code,
  annees,
}: {
  code: string;
  annees: number[];
}) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {annees.map((annee) => (
        <li key={annee}>
          <Link
            href={`/departements/${code}/${annee}`}
            className="group bg-card flex items-center justify-between rounded-xl border px-5 py-4 transition-shadow hover:shadow-md"
          >
            <p className="text-lg font-semibold">{annee}</p>
            <ArrowRight
              className="text-muted-foreground group-hover:text-primary size-5 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
