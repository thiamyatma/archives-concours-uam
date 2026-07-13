import Link from "next/link";
import { ArrowRight, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FiliereCard } from "@/components/shared/filiere-card";
import { StatsSection } from "@/components/shared/stats-section";
import { getFilieresWithStats } from "@/lib/data/filieres";
import { getGlobalStats } from "@/lib/data/stats";
import { withBuildTimeFallback } from "@/lib/data/safe";
import { SITE_SLOGAN } from "@/lib/constants";

// Filet de sécurité seulement : la vraie fraîcheur vient de revalidatePath/
// revalidateTag appelés par les actions admin (approve/reject/delete) dans
// lib/actions/admin.ts, pas de ce TTL — voir docs/PERFORMANCE.md.
export const revalidate = 3600;

export default async function HomePage() {
  const [filieres, stats] = await Promise.all([
    withBuildTimeFallback(() => getFilieresWithStats(), []),
    withBuildTimeFallback(() => getGlobalStats(), {
      totalDocuments: 0,
      totalDownloads: 0,
      totalContributors: 0,
    }),
  ]);

  return (
    <>
      <section className="from-primary/5 via-background to-background border-b bg-gradient-to-b">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <span className="bg-card text-muted-foreground inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
            Gratuit · Communautaire · Université Amadou Mahtar Mbow
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
            Archives Concours <span className="text-primary">UAM</span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg text-balance">
            {SITE_SLOGAN}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/bibliotheque">
                <Search className="size-4" aria-hidden="true" />
                Consulter les sujets
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/contribuer">
                <Upload className="size-4" aria-hidden="true" />
                Partager une épreuve
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <StatsSection stats={stats} />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-8 flex flex-col gap-2 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Parcourir par filière</h2>
          <p className="text-muted-foreground">
            Chaque filière dispose de sa propre bibliothèque d&apos;épreuves classées par
            année.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filieres.map((filiere) => (
            <FiliereCard key={filiere.id} filiere={filiere} />
          ))}
        </div>
      </section>

      <section className="bg-secondary/40 border-t">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">
            Vous avez une ancienne épreuve ?
          </h2>
          <p className="text-muted-foreground max-w-xl">
            Aidez les futurs bacheliers en partageant vos sujets et corrigés. Chaque
            contribution est vérifiée avant publication.
          </p>
          <Button asChild size="lg">
            <Link href="/contribuer">
              Partager une épreuve
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
