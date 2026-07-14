import type { Metadata } from "next";
import { DepartementCard } from "@/components/shared/departement-card";
import { getContentManifest } from "@/lib/data/departements";

export const metadata: Metadata = {
  title: "Départements",
  description:
    "Découvrez les 5 départements du concours d'entrée UAM et accédez à leurs archives d'épreuves : DSTI, DGAE, DSTAAN, DU2ADT, DGO.",
};

export default function DepartementsPage() {
  const manifest = getContentManifest();

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="mb-10 space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Les départements
        </h1>
        <p className="text-muted-foreground mx-auto max-w-2xl">
          Chaque département du concours UAM possède ses propres archives d&apos;épreuves,
          classées par année.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {manifest.departements.map((departement) => (
          <DepartementCard key={departement.code} departement={departement} />
        ))}
      </div>
    </div>
  );
}
