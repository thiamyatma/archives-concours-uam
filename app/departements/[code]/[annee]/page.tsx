import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import {
  DEPARTEMENTS,
  getConcoursContent,
  getDepartementAnnees,
  getDepartementByCode,
} from "@/lib/data/departements";

export const dynamicParams = false;

// Retourne directement le produit (département, année) complet — plutôt
// que de compter sur le fan-out du `params` du segment parent (`[code]`),
// qui n'est pas transmis de façon fiable ici. Next.js accepte qu'une
// génération de segments imbriqués renvoie les clés des DEUX segments.
export function generateStaticParams() {
  return DEPARTEMENTS.flatMap((departement) =>
    getDepartementAnnees(departement.code).map((annee) => ({
      code: departement.code,
      annee: String(annee),
    }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string; annee: string }>;
}): Promise<Metadata> {
  const { code, annee } = await params;
  const departement = getDepartementByCode(code);
  if (!departement) return {};

  return {
    title: `${departement.nom} ${annee}`,
    description: `Épreuve du concours ${departement.nom} pour l'année ${annee}.`,
  };
}

export default async function DepartementAnneePage({
  params,
}: {
  params: Promise<{ code: string; annee: string }>;
}) {
  const { code, annee: anneeParam } = await params;
  const departement = getDepartementByCode(code);
  const annee = Number(anneeParam);
  if (!departement || !Number.isInteger(annee)) notFound();

  const content = getConcoursContent(departement.code, annee);
  if (!content) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href={`/departements/${departement.code}`}>
          <ChevronLeft className="size-4" aria-hidden="true" />
          Retour à {departement.nom}
        </Link>
      </Button>

      <MarkdownRenderer className="text-center [&_ol]:list-inside [&_ul]:list-inside">
        {content.enTete}
      </MarkdownRenderer>

      <div className="mt-10 space-y-6">
        {content.sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-brand-blue text-center text-xl sm:text-2xl">
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MarkdownRenderer>{section.markdown}</MarkdownRenderer>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
