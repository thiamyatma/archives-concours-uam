import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ELLIPSIS, getPageNumbers } from "@/lib/pagination";

export interface PaginationProps {
  page: number;
  pageCount: number;
  /** Pages voisines de la page courante affichées de chaque côté (défaut 1). */
  siblingCount?: number;
  className?: string;
  /**
   * Mode "serveur" : génère le `href` d'une page (Server Components,
   * navigation via de vrais liens, sans JS requis). Fournir soit
   * `renderHref`, soit `onPageChange` — pas les deux.
   */
  renderHref?: (page: number) => string;
  /** Mode "client" : appelé avec le numéro de page cible (ex: tableau admin piloté par React Query). */
  onPageChange?: (page: number) => void;
}

/**
 * Pagination réutilisable, accessible (WCAG) : `<nav aria-label>`,
 * `aria-current="page"` sur la page active, boutons Précédent/Suivant
 * désactivés en butée (rendus en `<span>` plutôt qu'en lien/bouton actif,
 * pour ne pas laisser un élément interactif qui ne mène nulle part),
 * numéros de page navigables au clavier par défaut (boutons/liens natifs).
 * Responsive : les numéros de page se replient en simple "Page X sur Y"
 * sous le breakpoint `sm`, Précédent/Suivant restant toujours visibles.
 */
export function Pagination({
  page,
  pageCount,
  siblingCount = 1,
  className,
  renderHref,
  onPageChange,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  const pages = getPageNumbers(page, pageCount, siblingCount);
  const hasPrevious = page > 1;
  const hasNext = page < pageCount;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1.5", className)}
    >
      <NavButton
        direction="previous"
        targetPage={page - 1}
        disabled={!hasPrevious}
        renderHref={renderHref}
        onPageChange={onPageChange}
      />

      <div className="hidden items-center gap-1.5 sm:flex">
        {pages.map((p, i) =>
          p === ELLIPSIS ? (
            <span
              key={`ellipsis-${i}`}
              aria-hidden="true"
              className="text-muted-foreground px-1.5 text-sm"
            >
              …
            </span>
          ) : (
            <PageButton
              key={p}
              targetPage={p}
              isCurrent={p === page}
              renderHref={renderHref}
              onPageChange={onPageChange}
            />
          )
        )}
      </div>

      <span className="text-muted-foreground px-2 text-sm sm:hidden" aria-live="polite">
        Page {page} sur {pageCount}
      </span>

      <NavButton
        direction="next"
        targetPage={page + 1}
        disabled={!hasNext}
        renderHref={renderHref}
        onPageChange={onPageChange}
      />
    </nav>
  );
}

function NavButton({
  direction,
  targetPage,
  disabled,
  renderHref,
  onPageChange,
}: {
  direction: "previous" | "next";
  targetPage: number;
  disabled: boolean;
  renderHref?: (page: number) => string;
  onPageChange?: (page: number) => void;
}) {
  const label = direction === "previous" ? "Précédent" : "Suivant";
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  const content =
    direction === "previous" ? (
      <>
        <Icon className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">{label}</span>
      </>
    ) : (
      <>
        <span className="hidden sm:inline">{label}</span>
        <Icon className="size-4" aria-hidden="true" />
      </>
    );

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "opacity-50")}
      >
        {content}
      </span>
    );
  }

  if (renderHref) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href={renderHref(targetPage)} scroll={false} aria-label={label}>
          {content}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={label}
      onClick={() => onPageChange?.(targetPage)}
    >
      {content}
    </Button>
  );
}

function PageButton({
  targetPage,
  isCurrent,
  renderHref,
  onPageChange,
}: {
  targetPage: number;
  isCurrent: boolean;
  renderHref?: (page: number) => string;
  onPageChange?: (page: number) => void;
}) {
  const label = isCurrent
    ? `Page ${targetPage}, page actuelle`
    : `Aller à la page ${targetPage}`;
  const variant = isCurrent ? "default" : "outline";

  if (renderHref) {
    return (
      <Button
        asChild
        variant={variant}
        size="icon-sm"
        aria-current={isCurrent ? "page" : undefined}
      >
        <Link href={renderHref(targetPage)} scroll={false} aria-label={label}>
          {targetPage}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="icon-sm"
      aria-current={isCurrent ? "page" : undefined}
      aria-label={label}
      onClick={() => onPageChange?.(targetPage)}
    >
      {targetPage}
    </Button>
  );
}
