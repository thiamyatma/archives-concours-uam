import { requireAdminSession } from "@/lib/actions/admin-auth";

/**
 * Protège toutes les routes admin, sans exception : un appel à
 * requireAdminSession() dans chaque page serait facile à oublier sur une
 * future route (voir docs/pdf-downloads.md). Ce layout s'applique
 * automatiquement à tout ce qui est ajouté sous app/admin/(protected)/ —
 * /admin/login reste en dehors du groupe, donc jamais protégé par erreur.
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();
  return <>{children}</>;
}
