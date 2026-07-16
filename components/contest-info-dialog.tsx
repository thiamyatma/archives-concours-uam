"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ContestInfo } from "@/lib/contest/types";

/**
 * Fenêtre « Informations pratiques » du concours (section 5) : lieu, horaires,
 * pièces, matériel, consignes, lien officiel. N'affiche que les champs
 * renseignés. Le déclencheur n'apparaît que s'il y a au moins une info.
 */
export function ContestInfoDialog({ info }: { info: ContestInfo }) {
  const rows: { label: string; value: string }[] = [
    { label: "Lieu du concours", value: info.location },
    { label: "Heure de convocation", value: info.convocationTime },
    { label: "Heure de début", value: info.startTime },
    { label: "Pièces à fournir", value: info.documents },
    { label: "Matériel autorisé", value: info.allowedMaterial },
    { label: "Consignes importantes", value: info.instructions },
  ].filter((row) => row.value.trim().length > 0);

  const hasContent = rows.length > 0 || info.officialUrl.trim().length > 0;
  if (!hasContent) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          <Info className="size-4" aria-hidden="true" />
          Informations pratiques
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Informations sur le concours</DialogTitle>
          <DialogDescription>
            Détails pratiques pour le jour de l&apos;épreuve.
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="space-y-0.5">
              <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {row.label}
              </dt>
              <dd className="whitespace-pre-line">{row.value}</dd>
            </div>
          ))}
        </dl>

        {info.officialUrl.trim().length > 0 && (
          <Button asChild className="w-full">
            <a href={info.officialUrl} target="_blank" rel="noopener noreferrer">
              Site officiel
            </a>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
