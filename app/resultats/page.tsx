import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ResultatsSearch,
  type ResultatsSearchCandidat,
} from "@/components/resultats/resultats-search";
import { getContestSettings } from "@/lib/contest/settings";
import { DEPARTEMENTS } from "@/lib/departements";
import { getResultatsPourAnnee } from "@/lib/resultats/data";
import { ResultatsDepartements } from "@/components/resultats/resultats-departements";
// Contenu principalement git-versionné (content/resultats/**), mais le
// titre dépend de `contest_settings.year` (admin) — même raison que "/"
// (voir app/page.tsx) : revalider périodiquement plutôt que `force-dynamic`,
// le décalage de fraîcheur (au plus 1h) est sans conséquence ici.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { year } = await getContestSettings();
  return {
    title: `Résultats ${year}`,
    description: `Liste principale des admis au concours d'entrée UAM ${year}, par département et filière.`,
  };
}

export default async function ResultatsPage() {
  const { year } = await getContestSettings();
  const resultats = getResultatsPourAnnee(year);
  const auMoinsUnPublie = resultats.length > 0;

  const candidatsPourRecherche: ResultatsSearchCandidat[] = resultats.flatMap((r) => {
    const departement = DEPARTEMENTS.find((d) => d.code === r.departementCode);
    return r.admis.map((candidat) => ({
      departementCode: r.departementCode,
      departementNom: departement?.nom ?? r.departementCode.toUpperCase(),
      nom: candidat.nom,
      numero: undefined,
      filiere: candidat.filiere,
      dateNaissance: candidat.dateNaissance,
    }));
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="mb-10 space-y-2 text-center">
        <h1 className="text-brand-blue text-3xl font-bold tracking-tight sm:text-4xl">
          Résultats du concours {year}
        </h1>
        <p className="text-muted-foreground mx-auto max-w-2xl">
          Voici la liste principale des candidats admis en {year}, par département et par
          filière. Vous pouvez aussi rechercher directement un nom.
        </p>
      </div>

      {!auMoinsUnPublie ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-3 py-16 text-center text-sm">
            <GraduationCap
              className="text-muted-foreground/60 size-10"
              aria-hidden="true"
            />
            <p className="max-w-md">
              Les résultats du concours {year} n&apos;ont pas encore été publiés. Revenez
              bientôt : cette page sera mise à jour dès leur sortie.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-10">
            <ResultatsSearch candidats={candidatsPourRecherche} />
          </div>

          <ResultatsDepartements resultats={resultats} />
        </>
      )}
    </div>
  );
}
