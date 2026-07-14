import type { Metadata } from "next";
import { FileDown, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DownloadBarChart } from "@/components/admin/download-bar-chart";
import { requireAdminSession, logoutAdmin } from "@/lib/actions/admin-auth";
import { getDownloadStats } from "@/lib/data/download-stats";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Admin — Statistiques" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminSession();
  const stats = await getDownloadStats();

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Statistiques des téléchargements
          </h1>
          <p className="text-muted-foreground text-sm">
            PDF des épreuves, mis à jour en temps réel.
          </p>
        </div>
        <form action={logoutAdmin}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="size-4" aria-hidden="true" />
            Se déconnecter
          </Button>
        </form>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 py-2">
            <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
              <FileDown className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {formatNumber(stats.totalDownloads)}
              </p>
              <p className="text-muted-foreground text-xs">Téléchargements au total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-2">
            <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
              <FileDown className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {formatNumber(stats.totalFilesDownloaded)}
              </p>
              <p className="text-muted-foreground text-xs">
                Sessions distinctes téléchargées
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Par département</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byDepartement.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucun téléchargement pour le moment.
              </p>
            ) : (
              <DownloadBarChart
                items={stats.byDepartement.map((d) => ({
                  label: d.departementCode.toUpperCase(),
                  value: d.downloads,
                }))}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Par année</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byAnnee.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucun téléchargement pour le moment.
              </p>
            ) : (
              <DownloadBarChart
                items={stats.byAnnee.map((a) => ({
                  label: String(a.annee),
                  value: a.downloads,
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 10 des fichiers</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.top.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucun téléchargement pour le moment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Année</TableHead>
                  <TableHead className="text-right">Téléchargements</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.top.map((row) => (
                  <TableRow key={`${row.departementCode}-${row.annee}`}>
                    <TableCell className="font-medium">{row.fileName}</TableCell>
                    <TableCell>{row.departementCode.toUpperCase()}</TableCell>
                    <TableCell>{row.annee}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.downloads}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
