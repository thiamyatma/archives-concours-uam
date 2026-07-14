import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DepartementYearsList } from "@/components/shared/departement-years-list";
import {
  DEPARTEMENTS,
  getDepartementAnnees,
  getDepartementByCode,
} from "@/lib/data/departements";

// Tous les départements sont connus statiquement : un code hors de cette
// liste doit 404 immédiatement, pas être généré à la demande.
export const dynamicParams = false;

export function generateStaticParams() {
  return DEPARTEMENTS.map((d) => ({ code: d.code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const departement = getDepartementByCode(code);
  if (!departement) return {};

  return {
    title: departement.nom,
    description: departement.description,
  };
}

export default async function DepartementDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const departement = getDepartementByCode(code);
  if (!departement) notFound();

  const annees = getDepartementAnnees(departement.code);

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="mb-10 space-y-3">
        <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold">
          {departement.code.toUpperCase()}
        </span>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {departement.nom}
        </h1>
        <p className="text-muted-foreground max-w-2xl">{departement.description}</p>
      </div>

      <div className="mb-10 max-w-xs">
        <Card>
          <CardContent className="flex items-center gap-3 py-2">
            <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
              <CalendarDays className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-bold tabular-nums">{annees.length}</p>
              <p className="text-muted-foreground text-xs">Années archivées</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-4 text-xl font-semibold">Années disponibles</h2>

      {annees.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center">
          Aucune épreuve publiée pour ce département pour le moment.
        </p>
      ) : (
        <DepartementYearsList code={departement.code} annees={annees} />
      )}
    </div>
  );
}
