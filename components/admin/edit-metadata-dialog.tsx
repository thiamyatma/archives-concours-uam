"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { DepartementMultiSelect } from "@/components/admin/departement-multi-select";
import { updateDocumentMetadata } from "@/lib/actions/exam-documents";
import type { ExamDocument } from "@/lib/data/exam-documents";

export function EditMetadataDialog({
  document,
  open,
  onOpenChange,
}: {
  document: ExamDocument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [departementCodes, setDepartementCodes] = useState<string[]>(
    document.departementCodes
  );
  const [annee, setAnnee] = useState(String(document.annee));
  const [description, setDescription] = useState(document.description ?? "");
  const [statut, setStatut] = useState<"publie" | "brouillon">(document.statut);
  const [saving, setSaving] = useState(false);

  const anneeNumber = Number(annee);
  const isAnneeValid =
    annee.trim() !== "" &&
    Number.isInteger(anneeNumber) &&
    anneeNumber >= 2000 &&
    anneeNumber <= 2100;
  const canSave = departementCodes.length > 0 && isAnneeValid && !saving;

  async function handleSave() {
    setSaving(true);
    const result = await updateDocumentMetadata({
      id: document.id,
      departementCodes,
      annee: anneeNumber,
      description: description.trim() || undefined,
      statut,
    });
    setSaving(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Métadonnées mises à jour.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier les métadonnées</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Départements</Label>
            <DepartementMultiSelect
              selected={departementCodes}
              onChange={setDepartementCodes}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-annee">Année</Label>
            <Input
              id="edit-annee"
              type="number"
              inputMode="numeric"
              value={annee}
              onChange={(event) => setAnnee(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-statut">Statut</Label>
            <Select
              value={statut}
              onValueChange={(value) => setStatut(value as typeof statut)}
            >
              <SelectTrigger id="edit-statut" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brouillon">Brouillon</SelectItem>
                <SelectItem value="publie">Publié</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Description (optionnelle)</Label>
            <Textarea
              id="edit-description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" disabled={!canSave} onClick={handleSave}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
