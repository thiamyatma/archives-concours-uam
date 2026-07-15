"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEPARTEMENTS } from "@/lib/departements";

/**
 * Sélection multiple de départements pour un document (un même PDF peut
 * couvrir plusieurs départements). Pas de primitive shadcn "multi-select"
 * dédiée — construit avec `dropdown-menu` (`DropdownMenuCheckboxItem`) déjà
 * présent, `onSelect` empêché pour garder le menu ouvert entre les coches.
 */
export function DepartementMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  function toggle(code: string, checked: boolean) {
    onChange(checked ? [...selected, code] : selected.filter((c) => c !== code));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-between"
        >
          <span className="flex flex-wrap gap-1">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">Sélectionner…</span>
            ) : (
              selected.map((code) => (
                <Badge key={code} variant="secondary">
                  {code.toUpperCase()}
                </Badge>
              ))
            )}
          </span>
          <ChevronDown className="text-muted-foreground size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {DEPARTEMENTS.map((departement) => (
          <DropdownMenuCheckboxItem
            key={departement.code}
            checked={selected.includes(departement.code)}
            onCheckedChange={(checked) => toggle(departement.code, checked === true)}
            onSelect={(event) => event.preventDefault()}
          >
            {departement.nom}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
