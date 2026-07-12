import { Calendar, Download, HardDrive } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DownloadButton } from "@/components/shared/download-button";
import { PreviewDialog } from "@/components/shared/preview-dialog";
import { formatDate, formatFileSize, formatNumber } from "@/lib/format";
import { DOCUMENT_TYPE_LABELS, MATIERE_LABELS } from "@/lib/constants";
import type { DocumentWithFiliere } from "@/types/database";

export function DocumentCard({ document }: { document: DocumentWithFiliere }) {
  const title = `${document.filieres?.nom ?? ""} ${document.annee} — ${MATIERE_LABELS[document.matiere]} (${DOCUMENT_TYPE_LABELS[document.type]})`;

  return (
    <Card className="flex h-full flex-col justify-between">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{document.filieres?.nom ?? "—"}</Badge>
          <Badge variant="outline">{document.annee}</Badge>
          <Badge
            className={
              document.type === "corrige"
                ? "bg-primary/10 text-primary border-transparent"
                : "bg-secondary text-secondary-foreground border-transparent"
            }
          >
            {DOCUMENT_TYPE_LABELS[document.type]}
          </Badge>
        </div>
        <h3 className="text-base font-semibold">{MATIERE_LABELS[document.matiere]}</h3>
        {document.description && (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {document.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="text-muted-foreground space-y-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          <Download className="size-3.5" aria-hidden="true" />
          <span>
            {formatNumber(document.downloads)} téléchargement
            {document.downloads > 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <HardDrive className="size-3.5" aria-hidden="true" />
          <span>{formatFileSize(document.file_size)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5" aria-hidden="true" />
          <span>Ajouté le {formatDate(document.created_at)}</span>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <PreviewDialog documentId={document.id} title={title} />
        <DownloadButton documentId={document.id} className="flex-1" />
      </CardFooter>
    </Card>
  );
}
