"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAdditionalYears } from "@/lib/actions/download-pdf";

/**
 * Simple liste (pas de pagination) : le nombre d'années archivées par
 * département reste faible (une poignée), contrairement à l'ancienne
 * liste de filières qui pouvait accumuler des dizaines de documents.
 * Voir docs/PERFORMANCE.md.
 *
 * `annees` (dérivée du Markdown, calculée côté serveur) reste la liste
 * affichée immédiatement — la page elle-même reste 100% statique. Au
 * montage, une vérification légère côté client ajoute les années qui n'ont
 * qu'un PDF publié (sans contenu Markdown), pour qu'elles restent
 * découvrables sans redéploiement.
 */
export function DepartementYearsList({
  code,
  annees,
}: {
  code: string;
  annees: number[];
}) {
  const [allAnnees, setAllAnnees] = useState(annees);

  useEffect(() => {
    let cancelled = false;

    getAdditionalYears(code).then((extra) => {
      if (cancelled || extra.length === 0) return;
      setAllAnnees((prev) => [...new Set([...prev, ...extra])].sort((a, b) => b - a));
    });

    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {allAnnees.map((annee) => (
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
