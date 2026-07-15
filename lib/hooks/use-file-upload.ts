"use client";

import { useCallback, useState } from "react";
import {
  confirmUpload,
  createUploadUrl,
  type ConfirmUploadResult,
} from "@/lib/actions/exam-documents";

export type UploadStatus = "idle" | "uploading" | "success" | "error";

export interface UploadMetadata {
  departementCodes: string[];
  annee: number;
  description?: string;
  statut: "publie" | "brouillon";
  replaceDocumentId?: string;
}

/**
 * Upload direct navigateur -> Supabase Storage via une URL signée : les
 * octets ne transitent jamais par notre serveur (Vercel plafonne le corps
 * des requêtes serverless à ~4.5 Mo, très en dessous des PDF possibles).
 * `XMLHttpRequest` (pas `fetch`, qui n'expose la progression d'upload dans
 * aucun navigateur) réplique le format exact utilisé par
 * `uploadToSignedUrl` du SDK (`@supabase/storage-js`) : `FormData` avec un
 * champ `cacheControl` puis le fichier sous une clé vide, header
 * `x-upsert`. Voir le plan pour la vérification faite dans le code source
 * du SDK installé.
 */
export function useFileUpload() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, metadata: UploadMetadata): Promise<ConfirmUploadResult> => {
      setStatus("uploading");
      setProgress(0);
      setError(null);

      const target = await createUploadUrl({
        departementCodes: metadata.departementCodes,
        annee: metadata.annee,
        fileName: file.name,
        fileSize: file.size,
        replaceDocumentId: metadata.replaceDocumentId,
      });

      if ("error" in target) {
        setStatus("error");
        setError(target.error);
        return target;
      }

      try {
        await putFileWithProgress(
          target.signedUrl,
          file,
          Boolean(metadata.replaceDocumentId),
          setProgress
        );
      } catch {
        const message = "Échec de l'envoi du fichier.";
        setStatus("error");
        setError(message);
        return { error: message };
      }

      const result = await confirmUpload({
        departementCodes: metadata.departementCodes,
        annee: metadata.annee,
        fileName: file.name,
        fileSize: file.size,
        description: metadata.description,
        statut: metadata.statut,
        storagePath: target.path,
        replaceDocumentId: metadata.replaceDocumentId,
      });

      if ("error" in result) {
        setStatus("error");
        setError(result.error);
        return result;
      }

      setProgress(100);
      setStatus("success");
      return result;
    },
    []
  );

  return { upload, progress, status, error };
}

function putFileWithProgress(
  signedUrl: string,
  file: File,
  upsert: boolean,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("x-upsert", String(upsert));

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Échec de l'upload (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Échec de l'upload (réseau)"));

    // Ne jamais fixer Content-Type manuellement : le navigateur doit poser
    // lui-même le boundary multipart/form-data.
    const formData = new FormData();
    formData.append("cacheControl", "3600");
    formData.append("", file);
    xhr.send(formData);
  });
}
