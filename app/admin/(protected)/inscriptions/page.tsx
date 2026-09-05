import type { Metadata } from "next";
import { InscriptionsImportForm } from "@/components/admin/inscriptions-import-form";
import { InscriptionsSummaryTable } from "@/components/admin/inscriptions-summary-table";
import { getContestSettings } from "@/lib/contest/settings";
import { getInscriptionsSummary } from "@/lib/inscriptions/data";

export const metadata: Metadata = { title: "Admin — Inscriptions (vérification admis)" };
export const dynamic = "force-dynamic";

export default async function InscriptionsAdminPage() {
  const { year } = await getContestSettings();
  const summary = await getInscriptionsSummary(year);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Inscriptions ({year})</h1>
        <p className="text-muted-foreground text-sm">
          Liste de contrôle (nom + email) fournie par chaque département, utilisée
          uniquement pour la vérification « Je suis admis » (/verification). N&apos;a
          aucun lien avec les résultats publiés sur /resultats. Les liens WhatsApp remis
          après vérification se configurent dans{" "}
          <a href="/admin/parametres" className="underline underline-offset-2">
            Paramètres du concours → onglet WhatsApp
          </a>
          .
        </p>
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Importer une liste</h2>
        <InscriptionsImportForm />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Par département</h2>
        <InscriptionsSummaryTable summary={summary} />
      </div>
    </div>
  );
}
