import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { departementLabel, formatDuration, matiereLabel } from "@/lib/qcm/labels";
import type { QcmTopScore } from "@/lib/qcm/analytics-types";

/**
 * Classement des meilleures tentatives. À score égal, la durée la plus
 * courte prime (tri déjà appliqué dans analytics-compute.ts).
 */
export function QcmTopScores({ scores }: { scores: QcmTopScore[] }) {
  if (scores.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Aucune tentative notée pour ces filtres.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Département</TableHead>
            <TableHead>Matière</TableHead>
            <TableHead>Année</TableHead>
            <TableHead>Durée</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scores.map((row, i) => (
            <TableRow key={`${row.completedAt}-${i}`}>
              <TableCell className="text-muted-foreground tabular-nums">
                {i + 1}
              </TableCell>
              <TableCell>
                <Badge variant={row.scorePercent >= 70 ? "default" : "secondary"}>
                  {row.scorePercent}%
                </Badge>
                {row.correctAnswers !== null && row.totalQuestions !== null && (
                  <span className="text-muted-foreground ml-2 text-xs tabular-nums">
                    {row.correctAnswers}/{row.totalQuestions}
                  </span>
                )}
              </TableCell>
              <TableCell>{departementLabel(row.departementCode)}</TableCell>
              <TableCell>{matiereLabel(row.matiere)}</TableCell>
              <TableCell className="tabular-nums">{row.annee}</TableCell>
              <TableCell className="tabular-nums">
                {formatDuration(row.durationSeconds)}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {row.completedAt.slice(0, 10)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
