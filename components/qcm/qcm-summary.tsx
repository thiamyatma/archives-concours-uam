import { Award, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { QcmResume } from "@/lib/qcm/types";

const NIVEAU_STYLES: Record<string, string> = {
  Excellent: "text-emerald-600 dark:text-emerald-400",
  "Très bon": "text-emerald-600 dark:text-emerald-400",
  Bon: "text-brand-blue",
  Moyen: "text-amber-600 dark:text-amber-400",
  "À renforcer": "text-destructive",
};

/** Bilan affiché après soumission : score, pourcentage, niveau, commentaire et chapitres à revoir. */
export function QcmSummary({
  resume,
  nombreQuestions,
}: {
  resume: QcmResume;
  nombreQuestions: number;
}) {
  const pourcentage = resume.pourcentage ?? 0;
  const niveauClass = NIVEAU_STYLES[resume.niveau ?? ""] ?? "text-foreground";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Award className="text-brand-blue size-5" aria-hidden="true" />
          Votre bilan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-3xl font-bold">
            {resume.score}/{nombreQuestions}
            <span className="text-muted-foreground ml-2 text-base font-normal">
              ({pourcentage}%)
            </span>
          </p>
          <p className={`text-lg font-semibold ${niveauClass}`}>{resume.niveau}</p>
        </div>
        <Progress value={pourcentage} />
        <p className="text-sm">{resume.commentaire}</p>
        {resume.chapitres_a_revoir && resume.chapitres_a_revoir.length > 0 && (
          <div className="border-t pt-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <BookOpen className="size-4" aria-hidden="true" />
              Chapitres à revoir en priorité
            </p>
            <ol className="list-inside list-decimal space-y-1 text-sm">
              {resume.chapitres_a_revoir.map((chapitre) => (
                <li key={chapitre}>{chapitre}</li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
