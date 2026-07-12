"use client";

import { useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getDownloadUrl } from "@/lib/actions/download";

export function DownloadButton({
  documentId,
  variant = "default",
  size = "sm",
  className,
}: {
  documentId: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDownload() {
    startTransition(async () => {
      const result = await getDownloadUrl(documentId);
      if (result.error || !result.url) {
        toast.error(result.error ?? "Téléchargement impossible pour le moment.");
        return;
      }
      window.location.href = result.url;
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleDownload}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
      Télécharger
    </Button>
  );
}
