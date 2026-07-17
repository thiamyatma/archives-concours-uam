import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScoreProgressionChart } from "@/components/admin/qcm-charts";
import { getQcmCandidateProgression } from "@/lib/qcm/analytics";
import { departementLabel, formatDuration, matiereLabel } from "@/lib/qcm/labels";

export const metadata: Metadata = { title: "Admin — Progression d'un candidat" };
export const dynamic = "force-dynamic";

export default async function QcmCandidateDetailPage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;
  const progression = await getQcmCandidateProgression(decodeURIComponent(candidateId));
  if (!progression) notFound();

  const cards = [
    { label: "QCM réalisés", value: String(progression.attempts) },
    {
      label: "Score moyen",
      value: progression.avgScore === null ? "—" : `${progression.avgScore}%`,
    },
    {
      label: "Meilleur score",
      value: progression.bestScore === null ? "—" : `${progression.bestScore}%`,
    },
    { label: "Temps moyen", value: formatDuration(progression.avgDurationSeconds) },
    {
      label: "Matière la plus travaillée",
      value: progression.mostWorkedMatiere
        ? matiereLabel(progression.mostWorkedMatiere)
        : "—",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/analytics/candidats">
            <ChevronLeft className="size-4" aria-hidden="true" />
            Retour à la liste
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Progression du candidat</h1>
        <p className="text-muted-foreground font-mono text-xs break-all">
          {progression.candidateId}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="py-3">
              <p className="truncate text-lg font-bold tabular-nums">{card.value}</p>
              <p className="text-muted-foreground truncate text-xs">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Évolution des scores</CardTitle>
        </CardHeader>
        <CardContent>
          <ScoreProgressionChart data={progression.timeline} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique des tentatives</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Département</TableHead>
                <TableHead>Matière</TableHead>
                <TableHead>Année</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Durée</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {progression.timeline.map((t, i) => (
                <TableRow key={`${t.completedAt}-${i}`}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {t.completedAt.slice(0, 10)}
                  </TableCell>
                  <TableCell>{departementLabel(t.departementCode)}</TableCell>
                  <TableCell>{matiereLabel(t.matiere)}</TableCell>
                  <TableCell className="tabular-nums">{t.annee}</TableCell>
                  <TableCell>
                    {t.scorePercent === null ? (
                      "—"
                    ) : (
                      <Badge variant={t.scorePercent >= 70 ? "default" : "secondary"}>
                        {t.scorePercent}%
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatDuration(t.durationSeconds)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
