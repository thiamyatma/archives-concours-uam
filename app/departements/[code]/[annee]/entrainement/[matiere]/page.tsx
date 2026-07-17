import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QcmRunner } from "@/components/qcm/qcm-runner";
import { DEPARTEMENTS, getDepartementByCode } from "@/lib/data/departements";
import { getQcmMatiere, listQcmAnnees, listQcmMatieres } from "@/lib/qcm/data";
import { getQuestionImageUrl } from "@/lib/qcm/images";

// Même logique que la page épreuve : une combinaison (département, année,
// matière) inconnue au build n'est pas nécessairement une erreur (nouvel
// ajout de contenu QCM) — elle est générée à la demande au premier accès.
export const dynamicParams = true;

export function generateStaticParams() {
  return DEPARTEMENTS.flatMap((departement) =>
    listQcmAnnees(departement.contentGroup).flatMap((annee) =>
      listQcmMatieres(departement.contentGroup, annee).map((matiere) => ({
        code: departement.code,
        annee: String(annee),
        matiere,
      }))
    )
  );
}

async function resolveParams(
  params: Promise<{ code: string; annee: string; matiere: string }>
) {
  const { code, annee: anneeParam, matiere } = await params;
  const departement = getDepartementByCode(code);
  const annee = Number(anneeParam);
  if (!departement || !Number.isInteger(annee)) return null;

  const data = getQcmMatiere(departement.contentGroup, annee, matiere);
  if (!data) return null;

  return { departement, annee, matiere, data };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string; annee: string; matiere: string }>;
}): Promise<Metadata> {
  const resolved = await resolveParams(params);
  if (!resolved) return {};

  return {
    title: `Entraînement QCM — ${resolved.data.matiere} (${resolved.departement.nom} ${resolved.annee})`,
    description: `Entraînement interactif de type QCM sur l'épreuve de ${resolved.data.matiere} — ${resolved.departement.nom} ${resolved.annee}.`,
  };
}

export default async function EntrainementQcmPage({
  params,
}: {
  params: Promise<{ code: string; annee: string; matiere: string }>;
}) {
  const resolved = await resolveParams(params);
  if (!resolved) notFound();

  const { departement, annee, matiere, data } = resolved;

  const images: Partial<Record<number, string>> = {};
  for (const question of data.questions) {
    const url = getQuestionImageUrl(departement.contentGroup, annee, question.numero);
    if (url) images[question.numero] = url;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/departements/${departement.code}/${annee}`}>
            <ChevronLeft className="size-4" aria-hidden="true" />
            Retour à l&apos;épreuve
          </Link>
        </Button>
      </div>

      <div className="mb-8 text-center">
        <p className="text-muted-foreground text-sm">
          Entraînement QCM — {departement.nom} {annee}
        </p>
        <h1 className="text-brand-blue mt-1 text-2xl font-bold sm:text-3xl">
          {data.matiere}
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-sm">
          Répondez aux {data.nombre_questions} questions puis cliquez sur « Voir ma
          correction » pour découvrir votre score et une correction détaillée. Aucune
          réponse n&apos;est révélée avant la fin.
        </p>
      </div>

      <QcmRunner
        matiere={data.matiere}
        groupe={departement.contentGroup}
        annee={annee}
        matiereSlug={matiere}
        questions={data.questions}
        images={images}
      />
    </div>
  );
}
