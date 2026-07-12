"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getAdminPreviewUrl } from "@/lib/actions/admin";

export function PdfPreviewDialog({
  documentId,
  title,
}: {
  documentId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const { data, mutate, isPending, error } = useMutation({
    mutationFn: () => getAdminPreviewUrl(documentId),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) mutate();
      }}
    >
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
          {(error || data?.error) && !isPending && (
            <div className="text-destructive flex h-full items-center justify-center text-sm">
              {data?.error ?? "Impossible de charger l'aperçu."}
            </div>
          )}
          {data?.url && !isPending && (
            <iframe
              src={data.url}
              title={`Aperçu de ${title}`}
              className="h-full w-full"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
