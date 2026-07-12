"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { submitDocument, type ContributeState } from "@/lib/actions/contribute";
import {
  contributionFormSchema,
  type ContributionFormInput,
  type ContributionFormValues,
} from "@/lib/validations/document";
import {
  CURRENT_YEAR,
  DOCUMENT_TYPES,
  MATIERES,
  MIN_ARCHIVE_YEAR,
} from "@/lib/constants";
import { formatFileSize } from "@/lib/format";
import type { Filiere } from "@/types/database";

const YEARS = Array.from(
  { length: CURRENT_YEAR - MIN_ARCHIVE_YEAR + 1 },
  (_, i) => CURRENT_YEAR - i
);

const initialState: ContributeState = { success: false };

export function ContributionForm({ filieres }: { filieres: Filiere[] }) {
  const [state, formAction, isPending] = useActionState(submitDocument, initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);

  const form = useForm<ContributionFormInput, unknown, ContributionFormValues>({
    resolver: zodResolver(contributionFormSchema),
    defaultValues: {
      filiereId: "",
      annee: CURRENT_YEAR,
      matiere: undefined,
      type: undefined,
      description: "",
      contributorName: "",
      contributorEmail: "",
    },
  });

  useEffect(() => {
    if (state.success) {
      toast.success(
        "Merci ! Votre document a été soumis et sera vérifié avant publication."
      );
      form.reset();
      setFileLabel(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, form]);

  function onSubmit(values: ContributionFormValues) {
    const formData = new FormData();
    formData.set("filiereId", values.filiereId);
    formData.set("annee", String(values.annee));
    formData.set("matiere", values.matiere);
    formData.set("type", values.type);
    formData.set("description", values.description ?? "");
    formData.set("contributorName", values.contributorName ?? "");
    formData.set("contributorEmail", values.contributorEmail ?? "");
    formData.set("file", values.file);
    startTransition(() => {
      formAction(formData);
    });
  }

  if (state.success) {
    return (
      <Alert className="border-primary/30 bg-primary/5">
        <CheckCircle2 className="text-primary size-4" />
        <AlertTitle>Contribution envoyée !</AlertTitle>
        <AlertDescription>
          Merci pour votre partage. Un administrateur va vérifier votre document avant de
          le publier dans la bibliothèque.
        </AlertDescription>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => window.location.reload()}
        >
          Partager une autre épreuve
        </Button>
      </Alert>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="filiereId">Filière</Label>
          <Select
            value={form.watch("filiereId")}
            onValueChange={(value) =>
              form.setValue("filiereId", value, { shouldValidate: true })
            }
          >
            <SelectTrigger
              id="filiereId"
              aria-invalid={!!form.formState.errors.filiereId}
            >
              <SelectValue placeholder="Sélectionnez une filière" />
            </SelectTrigger>
            <SelectContent>
              {filieres.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.filiereId && (
            <p className="text-destructive text-sm">
              {form.formState.errors.filiereId.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="annee">Année</Label>
          <Select
            value={String(form.watch("annee") ?? "")}
            onValueChange={(value) =>
              form.setValue("annee", Number(value), { shouldValidate: true })
            }
          >
            <SelectTrigger id="annee" aria-invalid={!!form.formState.errors.annee}>
              <SelectValue placeholder="Sélectionnez une année" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.annee && (
            <p className="text-destructive text-sm">
              {form.formState.errors.annee.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="matiere">Matière</Label>
          <Select
            value={form.watch("matiere")}
            onValueChange={(value) =>
              form.setValue("matiere", value as ContributionFormValues["matiere"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="matiere" aria-invalid={!!form.formState.errors.matiere}>
              <SelectValue placeholder="Sélectionnez une matière" />
            </SelectTrigger>
            <SelectContent>
              {MATIERES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.matiere && (
            <p className="text-destructive text-sm">
              {form.formState.errors.matiere.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type de document</Label>
          <Select
            value={form.watch("type")}
            onValueChange={(value) =>
              form.setValue("type", value as ContributionFormValues["type"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="type" aria-invalid={!!form.formState.errors.type}>
              <SelectValue placeholder="Sujet ou corrigé ?" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.type && (
            <p className="text-destructive text-sm">
              {form.formState.errors.type.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optionnel)</Label>
        <Textarea
          id="description"
          rows={3}
          placeholder="Ex : session normale, épreuve complète avec barème..."
          {...form.register("description")}
        />
        {form.formState.errors.description && (
          <p className="text-destructive text-sm">
            {form.formState.errors.description.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contributorName">Nom du contributeur (optionnel)</Label>
          <Input
            id="contributorName"
            placeholder="Votre nom"
            {...form.register("contributorName")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contributorEmail">Email (optionnel)</Label>
          <Input
            id="contributorEmail"
            type="email"
            placeholder="vous@exemple.com"
            {...form.register("contributorEmail")}
          />
          {form.formState.errors.contributorEmail && (
            <p className="text-destructive text-sm">
              {form.formState.errors.contributorEmail.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">Fichier PDF</Label>
        <label
          htmlFor="file"
          className="hover:border-primary hover:bg-primary/5 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors"
        >
          <UploadCloud className="text-muted-foreground size-8" aria-hidden="true" />
          <span className="text-sm font-medium">
            {fileLabel ?? "Cliquez pour choisir un fichier PDF (20 Mo max)"}
          </span>
          <input
            ref={fileInputRef}
            id="file"
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                form.setValue("file", file, { shouldValidate: true });
                setFileLabel(`${file.name} (${formatFileSize(file.size)})`);
              }
            }}
          />
        </label>
        {form.formState.errors.file && (
          <p className="text-destructive text-sm">
            {form.formState.errors.file.message as string}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Envoi en cours..." : "Envoyer ma contribution"}
      </Button>
    </form>
  );
}
