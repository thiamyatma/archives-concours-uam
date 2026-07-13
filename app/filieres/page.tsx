import type { Metadata } from "next";
import { FiliereCard } from "@/components/shared/filiere-card";
import { getFilieresWithStats } from "@/lib/data/filieres";
import { withBuildTimeFallback } from "@/lib/data/safe";

export const metadata: Metadata = {
  title: "Filières",
  description:
    "Découvrez les 5 filières du concours d'entrée UAM et accédez à leur bibliothèque d'épreuves : DSTI, DGAE, DSTAN, DU2ADT, DGO.",
};

// Filet de sécurité seulement : l'action admin approve/reject/delete
// invalide déjà cette page à la demande (revalidateTag) — voir
// docs/PERFORMANCE.md.
export const revalidate = 3600;

export default async function FilieresPage() {
  const filieres = await withBuildTimeFallback(() => getFilieresWithStats(), []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="mb-10 space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Les filières</h1>
        <p className="text-muted-foreground mx-auto max-w-2xl">
          Chaque filière du concours UAM possède sa propre bibliothèque d&apos;épreuves,
          classée par année et par matière.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filieres.map((filiere) => (
          <FiliereCard key={filiere.id} filiere={filiere} />
        ))}
      </div>
    </div>
  );
}
