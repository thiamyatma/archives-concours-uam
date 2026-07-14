"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CompletenessBadge } from "@/components/shared/completeness-badge";
import { Pagination } from "@/components/shared/pagination";
import { usePagination } from "@/lib/hooks/use-pagination";
import type { YearCompleteness } from "@/lib/completeness";

const YEARS_PER_PAGE = 12;

/**
 * Pagination client, en mémoire, plutôt que server-side (LIMIT/OFFSET) :
 * `years` est déjà la sortie — petite et bornée (une ligne par année
 * archivée, pas par document) — d'une agrégation faite une seule fois côté
 * serveur (`getFiliereArchive`). La repaginer en base n'aurait aucun sens
 * ni bénéfice : le travail coûteux (parcourir les documents pour calculer
 * la complétude de chaque année) est déjà fait, quel que soit le nombre
 * d'années affichées par page. Paginer ici en garde surtout l'UI cohérente
 * si une filière accumule un jour plusieurs dizaines d'années.
 */
export function FiliereYearsList({
  years,
  filiereCode,
}: {
  years: YearCompleteness[];
  filiereCode: string;
}) {
  const pagination = usePagination({ total: years.length, pageSize: YEARS_PER_PAGE });
  const from = (pagination.page - 1) * YEARS_PER_PAGE;
  const visibleYears = years.slice(from, from + YEARS_PER_PAGE);

  return (
    <div className="space-y-6">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visibleYears.map((year) => (
          <li key={year.annee}>
            <Link
              href={`/filieres/${filiereCode}/${year.annee}`}
              className="group bg-card flex items-center justify-between rounded-xl border px-5 py-4 transition-shadow hover:shadow-md"
            >
              <div>
                <p className="text-lg font-semibold">{year.annee}</p>
                <div className="mt-1">
                  <CompletenessBadge count={year.count} total={year.total} />
                </div>
              </div>
              <ArrowRight
                className="text-muted-foreground group-hover:text-primary size-5 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>

      {pagination.pageCount > 1 && (
        <Pagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          onPageChange={pagination.setPage}
        />
      )}
    </div>
  );
}
