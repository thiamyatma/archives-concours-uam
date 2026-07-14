import { Skeleton } from "@/components/ui/skeleton";

/**
 * Affiché instantanément par Next.js (React Suspense) pendant qu'une
 * nouvelle page de `/bibliotheque` se charge (changement de page/filtre) —
 * reprend exactement la mise en page réelle (mêmes hauteurs, même grille)
 * pour qu'il n'y ait aucun saut visuel une fois les vraies données là.
 */
export default function BibliothequeLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>

      <Skeleton className="h-40 w-full rounded-xl" />

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-xl" />
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <Skeleton className="h-9 w-72" />
      </div>
    </div>
  );
}
