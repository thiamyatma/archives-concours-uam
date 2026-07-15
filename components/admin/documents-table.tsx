"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { EditMetadataDialog } from "@/components/admin/edit-metadata-dialog";
import { ReplacePdfDialog } from "@/components/admin/replace-pdf-dialog";
import { toggleDocumentStatus } from "@/lib/actions/exam-documents";
import { getDocumentPreviewUrl, getExamPdfDownloadUrl } from "@/lib/actions/download-pdf";
import { formatFileSize, formatNumber } from "@/lib/format";
import type { ExamDocument } from "@/lib/data/exam-documents";

export function DocumentsTable({ documents }: { documents: ExamDocument[] }) {
  const [editing, setEditing] = useState<ExamDocument | null>(null);
  const [replacing, setReplacing] = useState<ExamDocument | null>(null);
  const [deleting, setDeleting] = useState<ExamDocument | null>(null);

  async function handleConsulter(document: ExamDocument) {
    const result = await getDocumentPreviewUrl(
      document.departementCodes[0],
      document.annee
    );
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  async function handleTelecharger(document: ExamDocument) {
    const result = await getExamPdfDownloadUrl(
      document.departementCodes[0],
      document.annee
    );
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    window.location.href = result.url;
  }

  async function handleToggleStatus(document: ExamDocument) {
    const nextStatut = document.statut === "publie" ? "brouillon" : "publie";
    const result = await toggleDocumentStatus({ id: document.id, statut: nextStatut });
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(nextStatut === "publie" ? "Document publié." : "Document dépublié.");
  }

  if (documents.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
        Aucun document pour le moment.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Départements</TableHead>
              <TableHead>Année</TableHead>
              <TableHead>Fichier</TableHead>
              <TableHead>Taille</TableHead>
              <TableHead>Ajouté le</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Vues</TableHead>
              <TableHead className="text-right">Téléchargements</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id}>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {document.departementCodes.map((code) => (
                      <Badge key={code} variant="secondary">
                        {code.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{document.annee}</TableCell>
                <TableCell className="max-w-48 truncate" title={document.fileName}>
                  {document.fileName}
                </TableCell>
                <TableCell>{formatFileSize(document.fileSize)}</TableCell>
                <TableCell>
                  {new Date(document.createdAt).toLocaleDateString("fr-FR")}
                </TableCell>
                <TableCell>
                  <Badge variant={document.statut === "publie" ? "default" : "outline"}>
                    {document.statut === "publie" ? "Publié" : "Brouillon"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(document.views)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(document.downloads)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm">
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleConsulter(document)}>
                        Consulter
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTelecharger(document)}>
                        Télécharger
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditing(document)}>
                        Modifier les métadonnées
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setReplacing(document)}>
                        Remplacer le PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(document)}>
                        {document.statut === "publie" ? "Dépublier" : "Publier"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleting(document)}
                      >
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <EditMetadataDialog
          document={editing}
          open
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
      {replacing && (
        <ReplacePdfDialog
          document={replacing}
          open
          onOpenChange={(open) => !open && setReplacing(null)}
        />
      )}
      {deleting && (
        <DeleteDialog
          document={deleting}
          open
          onOpenChange={(open) => !open && setDeleting(null)}
        />
      )}
    </>
  );
}
