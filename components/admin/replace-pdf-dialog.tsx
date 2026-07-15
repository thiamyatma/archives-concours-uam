"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UploadProgress } from "@/components/admin/upload-progress";
import { useFileUpload } from "@/lib/hooks/use-file-upload";
import { MAX_PDF_SIZE_BYTES, PDF_MIME_TYPE } from "@/lib/pdf/constants";
import { formatFileSize } from "@/lib/format";
import type { ExamDocument } from "@/lib/data/exam-documents";

/** Remplace uniquement le fichier ; les métadonnées existantes du document sont conservées. */
export function ReplacePdfDialog({
  document,
  open,
  onOpenChange,
}: {
  document: ExamDocument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, progress, status, error } = useFileUpload();
  const isUploading = status === "uploading";

  function handleFileChange(fileList: FileList | null) {
    const selected = fileList?.[0];
    if (!selected) return;

    if (selected.type !== PDF_MIME_TYPE) {
      toast.error("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    if (selected.size > MAX_PDF_SIZE_BYTES) {
      toast.error(`Dépasse la taille maximale (${formatFileSize(MAX_PDF_SIZE_BYTES)}).`);
      return;
    }
    setFile(selected);
  }

  async function handleReplace() {
    if (!file) return;

    const result = await upload(file, {
      departementCodes: document.departementCodes,
      annee: document.annee,
      description: document.description ?? undefined,
      statut: document.statut,
      replaceDocumentId: document.id,
    });

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("PDF remplacé avec succès.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remplacer le PDF</DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">
          Remplace le fichier de « {document.fileName} » ({document.annee}). Les
          métadonnées (départements, année, statut) restent inchangées.
        </p>

        {isUploading ? (
          <UploadProgress value={progress} />
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              {file ? file.name : "Choisir un fichier PDF"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={PDF_MIME_TYPE}
              className="hidden"
              onChange={(event) => handleFileChange(event.target.files)}
            />
            {error && <p className="text-destructive text-xs">{error}</p>}
          </>
        )}

        <DialogFooter>
          <Button type="button" disabled={!file || isUploading} onClick={handleReplace}>
            Remplacer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
