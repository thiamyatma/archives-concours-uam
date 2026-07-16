import type { Metadata } from "next";
import { ContestSettingsForm } from "@/components/admin/contest-settings-form";
import { getContestSettings } from "@/lib/contest/settings";

export const metadata: Metadata = { title: "Paramètres du concours" };

export default async function ContestSettingsPage() {
  const settings = await getContestSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres du concours</h1>
        <p className="text-muted-foreground text-sm">
          Gérez les informations du concours affichées sur le site. Les modifications sont
          visibles immédiatement après l&apos;enregistrement.
        </p>
      </div>
      <ContestSettingsForm initial={settings} />
    </div>
  );
}
