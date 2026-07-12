"use client";

import { useCallback, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENT_YEAR, MATIERES, MIN_ARCHIVE_YEAR } from "@/lib/constants";
import type { Filiere } from "@/types/database";

const YEARS = Array.from(
  { length: CURRENT_YEAR - MIN_ARCHIVE_YEAR + 1 },
  (_, i) => CURRENT_YEAR - i
);

const ALL_VALUE = "__all__";

export function LibraryFilters({ filieres }: { filieres: Filiere[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === ALL_VALUE) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams]
  );

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ q: q || null });
  }

  const hasFilters =
    searchParams.has("q") ||
    searchParams.has("filiere") ||
    searchParams.has("annee") ||
    searchParams.has("matiere");

  return (
    <div className="bg-card space-y-4 rounded-xl border p-4 shadow-sm">
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <label htmlFor="library-search" className="sr-only">
          Rechercher un sujet
        </label>
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="library-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par mot-clé (ex : algèbre, grammaire...)"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isPending}>
          Rechercher
        </Button>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select
          value={searchParams.get("filiere") ?? ALL_VALUE}
          onValueChange={(value) => updateParams({ filiere: value })}
        >
          <SelectTrigger aria-label="Filtrer par filière">
            <SelectValue placeholder="Filière" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Toutes les filières</SelectItem>
            {filieres.map((f) => (
              <SelectItem key={f.id} value={f.code}>
                {f.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("annee") ?? ALL_VALUE}
          onValueChange={(value) => updateParams({ annee: value })}
        >
          <SelectTrigger aria-label="Filtrer par année">
            <SelectValue placeholder="Année" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Toutes les années</SelectItem>
            {YEARS.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("matiere") ?? ALL_VALUE}
          onValueChange={(value) => updateParams({ matiere: value })}
        >
          <SelectTrigger aria-label="Filtrer par matière">
            <SelectValue placeholder="Matière" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Toutes les matières</SelectItem>
            {MATIERES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setQ("");
            startTransition(() => router.push(pathname, { scroll: false }));
          }}
        >
          <X className="size-4" aria-hidden="true" />
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  );
}
