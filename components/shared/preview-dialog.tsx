"use client";

import { useState, useTransition } from "react";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getPreviewUrl } from "@/lib/actions/preview";

export function PreviewDialog({
  documentId,
  title,
}: {
  documentId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !url) {
      startTransition(async () => {
        const result = await getPreviewUrl(documentId);
        if (result.url) setUrl(result.url);
        else setError(result.error ?? "Aperçu indisponible.");
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Eye className="size-4" aria-hidden="true" />
          Aperçu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="bg-muted h-[70vh] overflow-hidden rounded-lg border">
          {isPending && (
            <div className="text-muted-foreground flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin" aria-hidden="true" />
            </div>
          )}
          {error && !isPending && (
            <div className="text-destructive flex h-full items-center justify-center text-sm">
              {error}
            </div>
          )}
          {url && !isPending && (
            <iframe src={url} title={`Aperçu de ${title}`} className="h-full w-full" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
