"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronLeft, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResultatDepartement } from "@/lib/resultats/types";
import { getDepartementByCode } from "@/lib/departements";

interface ResultatsDepartementsProps {
  resultats: ResultatDepartement[];
  eyebrow?: string;
  title?: string;
}

export function ResultatsDepartements({
  resultats,
  eyebrow = "Liste principale",
  title = "Choisissez un département",
}: ResultatsDepartementsProps) {
  const [departementCode, setDepartementCode] = useState<string | null>(null);
  const [filiere, setFiliere] = useState<string | null>(null);

  const resultat = resultats.find((item) => item.departementCode === departementCode);
  const filieres = resultat
    ? Array.from(
        new Set(
          resultat.admis.map((candidat) => candidat.filiere ?? "Filière non précisée")
        )
      )
    : [];
  const candidats =
    resultat?.admis.filter(
      (candidat) => (candidat.filiere ?? "Filière non précisée") === filiere
    ) ?? [];

  function selectDepartement(code: string) {
    setDepartementCode(code);
    setFiliere(null);
  }

  function goBack() {
    if (filiere) {
      setFiliere(null);
      return;
    }
    setDepartementCode(null);
  }

  if (resultat && filiere) {
    const departement = getDepartementByCode(resultat.departementCode);
    return (
      <section aria-labelledby="candidats-title" className="space-y-5">
        <Button variant="ghost" className="-ml-3 gap-2" onClick={goBack}>
          <ChevronLeft className="size-4" aria-hidden="true" />
          Retour aux filières
        </Button>
        <div className="flex items-end justify-between gap-4 border-b pb-4">
          <div>
            <p className="text-muted-foreground text-sm">{departement?.nom}</p>
            <h2 id="candidats-title" className="text-2xl font-semibold tracking-tight">
              {filiere}
            </h2>
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <Users className="size-3.5" aria-hidden="true" />
            {candidats.length} admis
          </Badge>
        </div>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {candidats.map((candidat, index) => (
            <li
              key={`${candidat.nom}-${candidat.dateNaissance ?? index}`}
              className="bg-card flex items-start gap-3 rounded-md border px-4 py-3"
            >
              <span className="text-muted-foreground mt-0.5 w-6 shrink-0 text-right tabular-nums">
                {index + 1}.
              </span>
              <span>
                <span className="block font-medium">{candidat.nom}</span>
                {candidat.dateNaissance && (
                  <span className="text-muted-foreground mt-1 block text-xs">
                    Né(e) le {candidat.dateNaissance}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  if (resultat) {
    const departement = getDepartementByCode(resultat.departementCode);
    return (
      <section aria-labelledby="filieres-title" className="space-y-5">
        <Button variant="ghost" className="-ml-3 gap-2" onClick={goBack}>
          <ChevronLeft className="size-4" aria-hidden="true" />
          Retour aux départements
        </Button>
        <div className="border-b pb-4">
          <p className="text-muted-foreground text-sm">Résultats par filière</p>
          <h2 id="filieres-title" className="text-2xl font-semibold tracking-tight">
            {departement?.nom}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filieres.map((nomFiliere) => {
            const count = resultat.admis.filter(
              (candidat) => (candidat.filiere ?? "Filière non précisée") === nomFiliere
            ).length;
            return (
              <button
                key={nomFiliere}
                type="button"
                onClick={() => setFiliere(nomFiliere)}
                className="group text-left"
              >
                <Card className="group-hover:border-primary/60 h-full transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                    <CardTitle className="text-base leading-snug">{nomFiliere}</CardTitle>
                    <ChevronDown
                      className="text-muted-foreground size-4 shrink-0 -rotate-90 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </CardHeader>
                  <CardContent>
                    <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                      <Users className="size-3.5" aria-hidden="true" />
                      {count} candidat{count > 1 ? "s" : " admis"}
                    </span>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="departements-title" className="space-y-5">
      <div className="border-b pb-4">
        <p className="text-muted-foreground text-sm">{eyebrow}</p>
        <h2 id="departements-title" className="text-2xl font-semibold tracking-tight">
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {resultats.map((item) => {
          const departement = getDepartementByCode(item.departementCode);
          return (
            <button
              key={item.departementCode}
              type="button"
              onClick={() => selectDepartement(item.departementCode)}
              className="group text-left"
            >
              <Card className="group-hover:border-primary/60 h-full transition-colors">
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">
                      {departement?.nom ?? item.departementCode}
                    </CardTitle>
                    <p className="text-muted-foreground text-sm">
                      Voir les filières et les admis
                    </p>
                  </div>
                  <ChevronDown
                    className="text-muted-foreground mt-1 size-5 shrink-0 -rotate-90 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </CardHeader>
                <CardContent>
                  <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <BookOpen className="size-3.5" aria-hidden="true" />
                    {item.admis.length} candidats admis
                  </span>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </section>
  );
}
