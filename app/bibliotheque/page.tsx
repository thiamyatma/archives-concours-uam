import type { Metadata } from "next";
import { Suspense } from "react";
import { FileSearch } from "lucide-react";
import { LibraryFilters } from "@/components/shared/library-filters";
import { DocumentCard } from "@/components/shared/document-card";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { getApprovedDocuments } from "@/lib/data/documents";
import { getAllFilieres } from "@/lib/data/filieres";
import { libraryFiltersSchema } from "@/lib/validations/document";

export const metadata: Metadata = {
  title: "Bibliothèque",
  description:
    "Recherchez et téléchargez gratuitement les anciennes épreuves du concours d'entrée UAM par filière, année et matière.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BibliothequePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const rawParams = await searchParams;
  const filters = libraryFiltersSchema.parse({
    q: firstValue(rawParams.q),
    filiere: firstValue(rawParams.filiere),
    annee: firstValue(rawParams.annee),
    matiere: firstValue(rawParams.matiere),
    page: firstValue(rawParams.page),
  });

  const [filieres, result] = await Promise.all([
    getAllFilieres(),
    getApprovedDocuments({
      q: filters.q,
      filiereCode: filters.filiere,
      annee: filters.annee,
      matiere: filters.matiere,
      page: filters.page,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Bibliothèque</h1>
        <p className="text-muted-foreground">
          {result.total} document{result.total !== 1 ? "s" : ""} approuvé
          {result.total !== 1 ? "s" : ""} au total.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
        <LibraryFilters filieres={filieres} />
      </Suspense>

      {result.documents.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-dashed p-16 text-center">
          <FileSearch className="text-muted-foreground size-10" aria-hidden="true" />
          <p className="text-lg font-medium">Aucun document trouvé</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Essayez d&apos;élargir votre recherche ou de modifier vos filtres.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Suspense fallback={null}>
              <PaginationControls page={result.page} pageCount={result.pageCount} />
            </Suspense>
          </div>
        </>
      )}
    </div>
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
