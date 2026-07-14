"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { usePagination } from "@/lib/hooks/use-pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { fetchContributors } from "@/lib/actions/admin";
import { formatDate } from "@/lib/format";

const SKELETON_ROWS = 6;
const TABLE_COLUMN_COUNT = 3;

export function ContributorsTable() {
  const queryClient = useQueryClient();
  const queryKeyBase = ["admin-contributors"] as const;

  // Même stratégie que le tableau des documents : le total exact n'est
  // redemandé qu'à la page 1, les pages suivantes réutilisent le total
  // déjà mis en cache par React Query pour cette page — voir
  // docs/PERFORMANCE.md.
  const page1Data = queryClient.getQueryData<
    Awaited<ReturnType<typeof fetchContributors>>
  >([...queryKeyBase, 1]);
  const knownTotal = page1Data?.total ?? 0;

  const pagination = usePagination({ total: knownTotal, pageSize: DEFAULT_PAGE_SIZE });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...queryKeyBase, pagination.page] as const,
    queryFn: () =>
      fetchContributors({ page: pagination.page, withCount: pagination.page === 1 }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contributeurs</h1>
        <p className="text-muted-foreground text-sm">
          {knownTotal} contributeur{knownTotal !== 1 ? "s" : ""} ayant renseigné leurs
          coordonnées lors d&apos;un dépôt.
        </p>
      </div>

      <div className="bg-card overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Contribue depuis le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <ContributorsTableSkeleton />
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={TABLE_COLUMN_COUNT}
                    className="text-muted-foreground h-32 text-center"
                  >
                    <Search className="mx-auto mb-2 size-6" aria-hidden="true" />
                    Aucun contributeur pour le moment.
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((contributor) => (
                  <TableRow key={contributor.id}>
                    <TableCell>{contributor.nom || "—"}</TableCell>
                    <TableCell>{contributor.email || "—"}</TableCell>
                    <TableCell>{formatDate(contributor.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-xs" aria-live="polite">
          {isFetching && !isLoading ? "Actualisation..." : " "}
        </p>
        <Pagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          onPageChange={pagination.setPage}
        />
      </div>
    </div>
  );
}

function ContributorsTableSkeleton() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <TableRow key={i}>
          {Array.from({ length: TABLE_COLUMN_COUNT }, (_, col) => (
            <TableCell key={col}>
              <Skeleton className="h-4 w-full max-w-40" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
