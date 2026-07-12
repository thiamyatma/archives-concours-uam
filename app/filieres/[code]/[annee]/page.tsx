import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileX2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/shared/download-button";
import { PreviewDialog } from "@/components/shared/preview-dialog";
import { getFiliereByCode } from "@/lib/data/filieres";
import { getDocumentsByFiliereAnnee } from "@/lib/data/documents";
import { formatDate, formatFileSize, formatNumber } from "@/lib/format";
import { DOCUMENT_TYPE_LABELS, MATIERES, MATIERE_LABELS } from "@/lib/constants";
import type { DocumentWithFiliere } from "@/types/database";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string; annee: string }>;
}): Promise<Metadata> {
  const { code, annee } = await params;
  const filiere = await getFiliereByCode(code);
  if (!filiere) return {};

  return {
    title: `${filiere.nom} ${annee}`,
    description: `Sujets et corrigés du concours ${filiere.nom} pour l'année ${annee}.`,
  };
}

export default async function FiliereAnneePage({
  params,
}: {
  params: Promise<{ code: string; annee: string }>;
}) {
  const { code, annee: anneeParam } = await params;
  const annee = Number(anneeParam);

  const filiere = await getFiliereByCode(code);
  if (!filiere || !Number.isInteger(annee)) notFound();

  const documents = await getDocumentsByFiliereAnnee(filiere.id, annee);
  const byMatiere = new Map<string, DocumentWithFiliere[]>();
  for (const doc of documents) {
    const list = byMatiere.get(doc.matiere) ?? [];
    list.push(doc);
    byMatiere.set(doc.matiere, list);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href={`/filieres/${filiere.code}`}>
          <ChevronLeft className="size-4" aria-hidden="true" />
          Retour à {filiere.nom}
        </Link>
      </Button>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {filiere.nom} — {annee}
      </h1>
      <p className="text-muted-foreground mt-2">
        {formatNumber(documents.length)} document{documents.length !== 1 ? "s" : ""}{" "}
        disponible
        {documents.length !== 1 ? "s" : ""} pour cette session.
      </p>

      <div className="mt-10 space-y-6">
        {MATIERES.map(({ value, label }) => {
          const docs = byMatiere.get(value) ?? [];
          const sujet = docs.find((d) => d.type === "sujet");
          const corrige = docs.find((d) => d.type === "corrige");

          return (
            <Card key={value}>
              <CardHeader>
                <CardTitle>{label}</CardTitle>
                <CardDescription>
                  {docs.length === 0
                    ? "Aucun document disponible pour cette matière."
                    : `${docs.length} fichier${docs.length > 1 ? "s" : ""} disponible${docs.length > 1 ? "s" : ""}.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {docs.length === 0 ? (
                  <div className="text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm">
                    <FileX2 className="size-4" aria-hidden="true" />
                    Document manquant —{" "}
                    <Link href="/contribuer" className="text-primary hover:underline">
                      contribuez pour compléter cette archive
                    </Link>
                    .
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[sujet, corrige].map((doc, i) =>
                      doc ? (
                        <div
                          key={doc.id}
                          className="flex flex-col justify-between gap-3 rounded-lg border p-4"
                        >
                          <div>
                            <Badge
                              className={
                                doc.type === "corrige"
                                  ? "bg-primary/10 text-primary border-transparent"
                                  : "bg-secondary text-secondary-foreground border-transparent"
                              }
                            >
                              {DOCUMENT_TYPE_LABELS[doc.type]}
                            </Badge>
                            {doc.description && (
                              <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                                {doc.description}
                              </p>
                            )}
                            <dl className="text-muted-foreground mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                              <dt>Téléchargements</dt>
                              <dd className="text-right">
                                {formatNumber(doc.downloads)}
                              </dd>
                              <dt>Taille</dt>
                              <dd className="text-right">
                                {formatFileSize(doc.file_size)}
                              </dd>
                              <dt>Ajouté le</dt>
                              <dd className="text-right">{formatDate(doc.created_at)}</dd>
                            </dl>
                          </div>
                          <div className="flex gap-2">
                            <PreviewDialog
                              documentId={doc.id}
                              title={`${filiere.nom} ${annee} — ${MATIERE_LABELS[doc.matiere]} (${DOCUMENT_TYPE_LABELS[doc.type]})`}
                            />
                            <DownloadButton documentId={doc.id} className="flex-1" />
                          </div>
                        </div>
                      ) : (
                        <div
                          key={i === 0 ? "missing-sujet" : "missing-corrige"}
                          className="text-muted-foreground flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-4 text-center text-sm"
                        >
                          <FileX2 className="size-4" aria-hidden="true" />
                          {i === 0 ? "Sujet" : "Corrigé"} manquant
                        </div>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
