"use client";

import { useState } from "react";
import { X } from "lucide-react";
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
import { DepartementMultiSelect } from "@/components/admin/departement-multi-select";
import { UploadProgress } from "@/components/admin/upload-progress";
import { useFileUpload } from "@/lib/hooks/use-file-upload";
import { formatFileSize } from "@/lib/format";

/** Une carte "en attente" = un fichier déposé + son propre mini-formulaire de métadonnées. */
export function PendingUploadCard({
  id,
  file,
  onImported,
  onRemove,
}: {
  id: string;
  file: File;
  onImported: () => void;
  onRemove: () => void;
}) {
  const [departementCodes, setDepartementCodes] = useState<string[]>([]);
  const [annee, setAnnee] = useState("");
  const [description, setDescription] = useState("");
  const [statut, setStatut] = useState<"publie" | "brouillon">("brouillon");
  const { upload, progress, status, error } = useFileUpload();

  const anneeNumber = Number(annee);
  const isAnneeValid =
    annee.trim() !== "" &&
    Number.isInteger(anneeNumber) &&
    anneeNumber >= 2000 &&
    anneeNumber <= 2100;
  const canImport = departementCodes.length > 0 && isAnneeValid && status !== "uploading";
  const isUploading = status === "uploading";

  async function handleImport() {
    const result = await upload(file, {
      departementCodes,
      annee: anneeNumber,
      description: description.trim() || undefined,
      statut,
    });

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(`${file.name} importé avec succès.`);
    onImported();
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{file.name}</p>
          <p className="text-muted-foreground text-xs">{formatFileSize(file.size)}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={isUploading}
          aria-label="Retirer ce fichier"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {isUploading ? (
        <UploadProgress value={progress} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Départements</Label>
              <DepartementMultiSelect
                selected={departementCodes}
                onChange={setDepartementCodes}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`annee-${id}`}>Année</Label>
              <Input
                id={`annee-${id}`}
                type="number"
                inputMode="numeric"
                placeholder="2025"
                value={annee}
                onChange={(event) => setAnnee(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`statut-${id}`}>Statut</Label>
              <Select
                value={statut}
                onValueChange={(value) => setStatut(value as typeof statut)}
              >
                <SelectTrigger id={`statut-${id}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brouillon">Brouillon</SelectItem>
                  <SelectItem value="publie">Publié</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`description-${id}`}>Description (optionnelle)</Label>
              <Textarea
                id={`description-${id}`}
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}

          <Button type="button" size="sm" disabled={!canImport} onClick={handleImport}>
            Importer
          </Button>
        </>
      )}
    </div>
  );
}
