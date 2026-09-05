import type { Metadata } from "next";
import { GraduationCap, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResultatsSearch,
  type ResultatsSearchCandidat,
} from "@/components/resultats/resultats-search";
import { getContestSettings } from "@/lib/contest/settings";
import { DEPARTEMENTS } from "@/lib/departements";
import { getResultatsPourAnnee } from "@/lib/resultats/data";

// Contenu principalement git-versionné (content/resultats/**), mais le
// titre dépend de `contest_settings.year` (admin) — même raison que "/"
// (voir app/page.tsx) : revalider périodiquement plutôt que `force-dynamic`,
// le décalage de fraîcheur (au plus 1h) est sans conséquence ici.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { year } = await getContestSettings();
  return {
    title: `Résultats ${year}`,
    description: `Résultats du concours d'entrée UAM ${year} par département : liste des candidats admis et recherche par nom.`,
  };
}

export default async function ResultatsPage() {
  const { year } = await getContestSettings();
  const resultats = getResultatsPourAnnee(year);
  const parDepartement = new Map(resultats.map((r) => [r.departementCode, r]));
  const auMoinsUnPublie = resultats.length > 0;

  const candidatsPourRecherche: ResultatsSearchCandidat[] = resultats.flatMap((r) => {
    const departement = DEPARTEMENTS.find((d) => d.code === r.departementCode);
    return r.admis.map((candidat) => ({
      departementCode: r.departementCode,
      departementNom: departement?.nom ?? r.departementCode.toUpperCase(),
      nom: candidat.nom,
      numero: candidat.numero,
    }));
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="mb-10 space-y-2 text-center">
        <h1 className="text-brand-blue text-3xl font-bold tracking-tight sm:text-4xl">
          Résultats du concours {year}
        </h1>
        <p className="text-muted-foreground mx-auto max-w-2xl">
          Retrouvez ci-dessous la liste des candidats admis, par département. Vous pouvez
          aussi rechercher directement un nom ou un numéro de table.
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

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {DEPARTEMENTS.map((departement) => {
              const resultat = parDepartement.get(departement.code);

              return (
                <Card key={departement.code}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-xl">{departement.nom}</CardTitle>
                      {resultat && (
                        <Badge variant="outline" className="gap-1">
                          <Users className="size-3" aria-hidden="true" />
                          {resultat.admis.length}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!resultat ? (
                      <p className="text-muted-foreground text-sm">
                        Résultats non encore publiés pour ce département.
                      </p>
                    ) : (
                      <ol className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                        {resultat.admis.map((candidat, index) => (
                          <li
                            key={`${candidat.nom}-${candidat.numero ?? index}`}
                            className="flex items-baseline gap-2"
                          >
                            <span className="text-muted-foreground shrink-0 tabular-nums">
                              {index + 1}.
                            </span>
                            <span>
                              {candidat.nom}
                              {candidat.numero && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  — {candidat.numero}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
