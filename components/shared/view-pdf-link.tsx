"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getDocumentPreviewUrl } from "@/lib/actions/download-pdf";

export function ViewPdfLink({
  departementCode,
  annee,
}: {
  departementCode: string;
  annee: number;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await getDocumentPreviewUrl(departementCode, annee);
    setLoading(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
    >
      <ExternalLink className="size-4" aria-hidden="true" />
      Consulter
    </Button>
  );
}
