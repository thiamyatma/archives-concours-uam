"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTEMENTS } from "@/lib/departements";
import { parseInscriptionsInput } from "@/lib/inscriptions/parse";
import { importInscriptions } from "@/lib/actions/inscriptions";

/**
 * Import (admin) de la liste d'inscrits d'un département : coller le texte
 * reçu du département ("nom,email" par ligne — virgule, point-virgule ou
 * tabulation acceptés), aperçu du parsing avant confirmation, puis envoi.
 * Pas d'upload de fichier : un simple copier-coller depuis le tableur du
 * département suffit, aucune dépendance de parsing Excel/CSV côté serveur.
 */
export function InscriptionsImportForm() {
  const router = useRouter();
  const [departementCode, setDepartementCode] = useState(DEPARTEMENTS[0]?.code ?? "");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsed = useMemo(() => parseInscriptionsInput(text), [text]);
  const hasText = text.trim().length > 0;

  async function handleSubmit() {
    if (parsed.rows.length === 0) return;
    setSubmitting(true);
    const result = await importInscriptions({ departementCode, rows: parsed.rows });
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.imported} inscription(s) importée(s).`);
    setText("");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="inscriptions-departement">Département</Label>
          <Select value={departementCode} onValueChange={setDepartementCode}>
            <SelectTrigger id="inscriptions-departement" className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPARTEMENTS.map((d) => (
                <SelectItem key={d.code} value={d.code}>
                  {d.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="inscriptions-text">
            Liste des inscrits (une ligne par candidat : nom,email)
          </Label>
          <Textarea
            id="inscriptions-text"
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              "DIOP Fatou Awa,fatou.diop@example.com\nSARR Moussa,moussa.sarr@example.com"
            }
            className="font-mono text-sm"
          />
        </div>

        {hasText && (
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              {parsed.rows.length} ligne{parsed.rows.length > 1 ? "s" : ""} valide
              {parsed.rows.length > 1 ? "s" : ""} détectée
              {parsed.rows.length > 1 ? "s" : ""}
              {parsed.errors.length > 0 &&
                ` — ${parsed.errors.length} ligne(s) ignorée(s)`}
              .
            </p>
            {parsed.errors.length > 0 && (
              <ul className="text-destructive list-inside list-disc">
                {parsed.errors.slice(0, 10).map((error) => (
                  <li key={error}>{error}</li>
                ))}
                {parsed.errors.length > 10 && (
                  <li>… et {parsed.errors.length - 10} autre(s).</li>
                )}
              </ul>
            )}
          </div>
        )}

        <Button onClick={handleSubmit} disabled={submitting || parsed.rows.length === 0}>
          {submitting
            ? "Import en cours…"
            : `Importer ${parsed.rows.length || ""} inscription(s)`}
        </Button>
        <p className="text-muted-foreground text-xs">
          Un email déjà présent (même année) est mis à jour, pas dupliqué — un ré-import
          corrige la liste.
        </p>
      </CardContent>
    </Card>
  );
}
