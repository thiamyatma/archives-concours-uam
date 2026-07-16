import Link from "next/link";
import { Building2, CalendarDays, LayoutGrid, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DepartementCard } from "@/components/shared/departement-card";
import { StatsSection, type StatItem } from "@/components/shared/stats-section";
import { ContestBanner } from "@/components/contest-banner";
import { ContestCountdown } from "@/components/contest-countdown";
import { getContentManifest } from "@/lib/data/departements";
import { getContestSettings } from "@/lib/contest/settings";
import { SITE_SLOGAN } from "@/lib/constants";

export default async function HomePage() {
  const manifest = getContentManifest();
  // Paramètres du concours chargés depuis Supabase (cachés + revalidés après
  // édition admin — voir lib/contest/settings.ts). Plus aucune date en dur.
  const contestSettings = await getContestSettings();

  const stats: StatItem[] = [
    { icon: Building2, label: "Départements", value: manifest.totalDepartements },
    { icon: LayoutGrid, label: "Sessions archivées", value: manifest.totalSessions },
    {
      icon: CalendarDays,
      label: "Dernière année ajoutée",
      value: manifest.latestAnnee ?? "—",
    },
  ];

  return (
    <>
      <section className="from-primary/5 via-background to-background border-b bg-gradient-to-b">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <span className="bg-card text-muted-foreground inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
            Gratuit · Université Amadou Mahtar Mbow
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
            Archives Concours <span className="text-primary">UAM</span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg text-balance">
            {SITE_SLOGAN}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/departements">
                <Search className="size-4" aria-hidden="true" />
                Consulter les épreuves
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-4 px-4 pt-16 sm:px-6">
        <ContestBanner banner={contestSettings.banner} />
        <ContestCountdown settings={contestSettings} />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <StatsSection items={stats} />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-8 flex flex-col gap-2 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Parcourir par département</h2>
          <p className="text-muted-foreground">
            Chaque département dispose de ses propres archives d&apos;épreuves classées
            par année.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {manifest.departements.map((departement) => (
            <DepartementCard key={departement.code} departement={departement} />
          ))}
        </div>
      </section>
    </>
  );
}
