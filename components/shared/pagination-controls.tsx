"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";

export function PaginationControls({
  page,
  pageCount,
}: {
  page: number;
  pageCount: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pageCount <= 1) return null;

  function hrefForPage(target: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(target));
    return `${pathname}?${params.toString()}`;
  }

  return (
    <Pagination>
      <PaginationContent className="gap-2">
        <PaginationItem>
          <Button asChild variant="outline" size="sm" disabled={page <= 1}>
            {page <= 1 ? (
              <span aria-disabled="true">
                <ChevronLeft className="size-4" /> Précédent
              </span>
            ) : (
              <Link href={hrefForPage(page - 1)} scroll={false}>
                <ChevronLeft className="size-4" /> Précédent
              </Link>
            )}
          </Button>
        </PaginationItem>
        <PaginationItem>
          <span className="text-muted-foreground px-3 text-sm">
            Page {page} sur {pageCount}
          </span>
        </PaginationItem>
        <PaginationItem>
          <Button asChild variant="outline" size="sm" disabled={page >= pageCount}>
            {page >= pageCount ? (
              <span aria-disabled="true">
                Suivant <ChevronRight className="size-4" />
              </span>
            ) : (
              <Link href={hrefForPage(page + 1)} scroll={false}>
                Suivant <ChevronRight className="size-4" />
              </Link>
            )}
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
