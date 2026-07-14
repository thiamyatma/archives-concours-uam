import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Download, FileStack } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FiliereYearsList } from "@/components/shared/filiere-years-list";
import { getAllFilieres, getFiliereArchive, getFiliereByCode } from "@/lib/data/filieres";
import { formatNumber } from "@/lib/format";

// Filet de sécurité seulement : lib/actions/admin.ts appelle déjà
// revalidatePath(`/filieres/${code}`) à la validation/refus/suppression
// d'un document de cette filière — voir docs/PERFORMANCE.md.
export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const filieres = await getAllFilieres();
    return filieres.map((f) => ({ code: f.code }));
  } catch {
    // Supabase indisponible au build : les pages seront générées à la demande (ISR).
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const filiere = await getFiliereByCode(code);
  if (!filiere) return {};

  return {
    title: filiere.nom,
    description: filiere.description,
  };
}

export default async function FiliereDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const filiere = await getFiliereByCode(code);
  if (!filiere) notFound();

  const archive = await getFiliereArchive(filiere.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="mb-10 space-y-3">
        <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold">
          {filiere.code.toUpperCase()}
        </span>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{filiere.nom}</h1>
        <p className="text-muted-foreground max-w-2xl">{filiere.description}</p>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-2">
            <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
              <FileStack className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {formatNumber(archive.totalDocuments)}
              </p>
              <p className="text-muted-foreground text-xs">Documents disponibles</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-2">
            <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
              <Download className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {formatNumber(archive.totalDownloads)}
              </p>
              <p className="text-muted-foreground text-xs">Téléchargements</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-2">
            <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
              <CalendarDays className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-bold tabular-nums">{archive.years.length}</p>
              <p className="text-muted-foreground text-xs">Années archivées</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-4 text-xl font-semibold">Années disponibles</h2>

      {archive.years.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center">
          Aucune épreuve publiée pour cette filière pour le moment.{" "}
          <Link href="/contribuer" className="text-primary hover:underline">
            Soyez le premier à en partager une.
          </Link>
        </p>
      ) : (
        <FiliereYearsList years={archive.years} filiereCode={filiere.code} />
      )}
    </div>
  );
}
