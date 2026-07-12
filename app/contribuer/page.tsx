import type { Metadata } from "next";
import { ContributionForm } from "@/components/shared/contribution-form";
import { getAllFilieres } from "@/lib/data/filieres";
import { withBuildTimeFallback } from "@/lib/data/safe";

export const metadata: Metadata = {
  title: "Partager une épreuve",
  description:
    "Partagez une ancienne épreuve du concours UAM (sujet ou corrigé) pour aider les futurs candidats. Vérification avant publication.",
};

export default async function ContribuerPage() {
  const filieres = await withBuildTimeFallback(() => getAllFilieres(), []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="mb-8 space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Partager une épreuve
        </h1>
        <p className="text-muted-foreground">
          Déposez un sujet ou un corrigé au format PDF. Votre contribution sera vérifiée
          par un administrateur avant d&apos;apparaître publiquement dans la bibliothèque.
        </p>
      </div>
      <div className="bg-card rounded-2xl border p-6 shadow-sm sm:p-8">
        <ContributionForm filieres={filieres} />
      </div>
    </div>
  );
}
