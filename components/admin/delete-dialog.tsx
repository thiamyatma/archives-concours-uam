"use client";

import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteDocument } from "@/lib/actions/exam-documents";
import type { ExamDocument } from "@/lib/data/exam-documents";

export function DeleteDialog({
  document,
  open,
  onOpenChange,
}: {
  document: ExamDocument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  async function handleDelete() {
    const result = await deleteDocument({ id: document.id });
    if ("error" in result) toast.error(result.error);
    else toast.success(`${document.fileName} supprimé.`);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
          <AlertDialogDescription>
            « {document.fileName} » ({document.annee}) sera définitivement supprimé, avec
            son fichier PDF. Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
