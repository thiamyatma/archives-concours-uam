"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { searchCandidats, type SearchableCandidat } from "@/lib/resultats/search";

export interface ResultatsSearchCandidat extends SearchableCandidat {
  departementNom: string;
}

/**
 * Recherche d'un candidat admis, tous départements confondus. Filtrage
 * entièrement côté client (`searchCandidats`, lib/resultats/search.ts) : le
 * jeu de données d'une session de résultats reste modeste (quelques
 * centaines de candidats au plus), pas besoin d'aller-retour serveur par
 * frappe.
 */
export function ResultatsSearch({ candidats }: { candidats: ResultatsSearchCandidat[] }) {
  const [query, setQuery] = useState("");
  const resultats = useMemo(() => searchCandidats(candidats, query), [candidats, query]);
  const hasQuery = query.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un candidat admis (nom ou numéro de table)…"
          className="h-11 pl-9"
          aria-label="Rechercher un candidat admis"
        />
      </div>

      {hasQuery &&
        (resultats.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aucun candidat trouvé pour « {query.trim()} ».
          </p>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {resultats.map((candidat) => (
                <div
                  key={`${candidat.departementCode}-${candidat.nom}-${candidat.numero ?? ""}`}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{candidat.nom}</p>
                    {candidat.numero && (
                      <p className="text-muted-foreground text-xs">
                        N° {candidat.numero}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary">{candidat.departementNom}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
