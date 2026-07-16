"use client";

import { useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { QcmSummary } from "@/components/qcm/qcm-summary";
import { corrigerQcm, type QcmCorrectedQuestion } from "@/lib/qcm/scoring";
import type { Lettre, QcmQuestion } from "@/lib/qcm/types";
import { cn } from "@/lib/utils";

const LETTRES: Lettre[] = ["A", "B", "C", "D"];

/**
 * Composant client de l'entraînement QCM : sélection des réponses, puis
 * correction complète une fois que le candidat clique sur « Voir ma
 * correction ». Aucune bonne réponse n'est signalée avant ce moment — tout
 * l'état (réponses, soumission) reste local à la session du navigateur,
 * rien n'est envoyé ni persisté côté serveur.
 */
export function QcmRunner({
  matiere,
  questions,
  images,
}: {
  matiere: string;
  questions: QcmQuestion[];
  images: Partial<Record<number, string>>;
}) {
  const [reponses, setReponses] = useState<Map<number, Lettre>>(new Map());
  const [resultat, setResultat] = useState<ReturnType<typeof corrigerQcm> | null>(null);

  const nombreReponses = reponses.size;
  const toutesRepondues = nombreReponses === questions.length;

  const questionsAffichees: (QcmQuestion | QcmCorrectedQuestion)[] =
    resultat?.questions ?? questions;

  function selectionner(numero: number, lettre: Lettre) {
    if (resultat) return;
    setReponses((precedent) => new Map(precedent).set(numero, lettre));
  }

  function voirCorrection() {
    setResultat(corrigerQcm(matiere, questions, reponses));
  }

  function recommencer() {
    setReponses(new Map());
    setResultat(null);
  }

  return (
    <div className="space-y-6">
      {resultat ? (
        <QcmSummary resume={resultat.resume} nombreQuestions={questions.length} />
      ) : (
        <div className="bg-card sticky top-20 z-10 flex items-center gap-4 rounded-xl border p-4 shadow-sm">
          <div className="flex-1">
            <p className="mb-1.5 text-sm font-medium">
              {nombreReponses}/{questions.length} questions répondues
            </p>
            <Progress value={(nombreReponses / questions.length) * 100} />
          </div>
          <Button onClick={voirCorrection} disabled={!toutesRepondues}>
            Voir ma correction
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {questionsAffichees.map((question) => (
          <QcmQuestionCard
            key={question.numero}
            question={question}
            corrige={resultat !== null}
            reponseSelectionnee={reponses.get(question.numero)}
            imageUrl={images[question.numero]}
            onSelect={(lettre) => selectionner(question.numero, lettre)}
          />
        ))}
      </div>

      {resultat && (
        <div className="flex justify-center pb-4">
          <Button variant="outline" onClick={recommencer}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Recommencer le QCM
          </Button>
        </div>
      )}
    </div>
  );
}

function QcmQuestionCard({
  question,
  corrige,
  reponseSelectionnee,
  imageUrl,
  onSelect,
}: {
  question: QcmQuestion | QcmCorrectedQuestion;
  corrige: boolean;
  reponseSelectionnee: Lettre | undefined;
  imageUrl: string | undefined;
  onSelect: (lettre: Lettre) => void;
}) {
  const corrigee = corrige ? (question as QcmCorrectedQuestion) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-snug font-medium">
            <span className="text-muted-foreground mr-1.5">{question.numero}.</span>
            <MarkdownRenderer className="prose-p:inline prose-p:m-0">
              {question.question}
            </MarkdownRenderer>
          </CardTitle>
          {corrigee && (
            <Badge
              variant={corrigee.resultat === "Correct" ? "default" : "destructive"}
              className="shrink-0"
            >
              {corrigee.resultat === "Correct" ? (
                <Check className="size-3" aria-hidden="true" />
              ) : (
                <X className="size-3" aria-hidden="true" />
              )}
              {corrigee.resultat}
            </Badge>
          )}
        </div>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- image d'archive statique, dimensions variables
          <img
            src={imageUrl}
            alt={`Illustration de la question ${question.numero}`}
            className="mt-2 max-h-64 rounded-lg border object-contain"
          />
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {LETTRES.map((lettre) => {
          const estSelectionnee = reponseSelectionnee === lettre;
          const estBonneReponse = corrigee && lettre === question.bonne_reponse;
          const estMauvaiseSelection = corrigee && estSelectionnee && !estBonneReponse;

          return (
            <button
              key={lettre}
              type="button"
              disabled={corrige}
              onClick={() => onSelect(lettre)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                !corrige && "hover:bg-muted cursor-pointer",
                !corrige && estSelectionnee && "border-primary bg-primary/5",
                !corrige && !estSelectionnee && "border-border",
                corrige && "cursor-default",
                estBonneReponse &&
                  "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
                estMauvaiseSelection && "border-destructive bg-destructive/5"
              )}
            >
              <span className="font-semibold">{lettre}.</span>
              <MarkdownRenderer className="prose-p:m-0 flex-1">
                {question.propositions[lettre]}
              </MarkdownRenderer>
            </button>
          );
        })}
      </CardContent>
      {corrigee && (
        <CardContent className="border-t pt-4">
          <p className="text-sm">{corrigee.justification}</p>
          <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span>Concept : {corrigee.concept}</span>
            <span>Difficulté : {corrigee.difficulte}</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
