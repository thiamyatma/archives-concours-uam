import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getQcmCandidates } from "@/lib/qcm/analytics";

export const metadata: Metadata = { title: "Admin — Progression des candidats" };
export const dynamic = "force-dynamic";

export default async function QcmCandidatesPage() {
  const candidates = await getQcmCandidates();

  return (
    <div>
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/analytics">
            <ChevronLeft className="size-4" aria-hidden="true" />
            Retour aux Analytics QCM
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Progression des candidats</h1>
        <p className="text-muted-foreground text-sm">
          Chaque candidat est un appareil anonyme (jeton de navigateur), pas un compte.
        </p>
      </div>

      {candidates.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-16 text-center text-sm">
            Aucun candidat rattachable pour le moment.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto py-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead>QCM réalisés</TableHead>
                  <TableHead>Score moyen</TableHead>
                  <TableHead>Meilleur score</TableHead>
                  <TableHead>Dernière activité</TableHead>
                  <TableHead className="text-right">Détail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => (
                  <TableRow key={c.candidateId}>
                    <TableCell className="font-mono text-xs">
                      {c.candidateId.slice(0, 8)}…
                    </TableCell>
                    <TableCell className="tabular-nums">{c.attempts}</TableCell>
                    <TableCell className="tabular-nums">
                      {c.avgScore === null ? "—" : `${c.avgScore}%`}
                    </TableCell>
                    <TableCell>
                      {c.bestScore === null ? (
                        "—"
                      ) : (
                        <Badge variant={c.bestScore >= 70 ? "default" : "secondary"}>
                          {c.bestScore}%
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {c.lastActivity.slice(0, 10)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="xs">
                        <Link
                          href={`/admin/analytics/candidats/${encodeURIComponent(c.candidateId)}`}
                        >
                          Voir
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
