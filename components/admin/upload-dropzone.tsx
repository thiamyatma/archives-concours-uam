"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PendingUploadCard } from "@/components/admin/pending-upload-card";
import { MAX_PDF_SIZE_BYTES, PDF_MIME_TYPE } from "@/lib/pdf/constants";
import { formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PendingFile {
  id: string;
  file: File;
}

export function UploadDropzone() {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const accepted: PendingFile[] = [];
    for (const file of Array.from(fileList)) {
      if (file.type !== PDF_MIME_TYPE) {
        toast.error(`${file.name} : seuls les fichiers PDF sont acceptés.`);
        continue;
      }
      if (file.size > MAX_PDF_SIZE_BYTES) {
        toast.error(
          `${file.name} : dépasse la taille maximale (${formatFileSize(MAX_PDF_SIZE_BYTES)}).`
        );
        continue;
      }
      accepted.push({ id: crypto.randomUUID(), file });
    }

    if (accepted.length > 0) setPendingFiles((prev) => [...prev, ...accepted]);
  }

  function removePending(id: string) {
    setPendingFiles((prev) => prev.filter((pending) => pending.id !== id));
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        )}
      >
        <Upload
          className="text-muted-foreground mx-auto mb-3 size-8"
          aria-hidden="true"
        />
        <p className="text-sm font-medium">Glissez-déposez un ou plusieurs PDF ici</p>
        <p className="text-muted-foreground mb-3 text-xs">ou</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          Choisir des fichiers
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={PDF_MIME_TYPE}
          multiple
          className="hidden"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {pendingFiles.length > 0 && (
        <div className="space-y-3">
          {pendingFiles.map((pending) => (
            <PendingUploadCard
              key={pending.id}
              id={pending.id}
              file={pending.file}
              onImported={() => removePending(pending.id)}
              onRemove={() => removePending(pending.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
