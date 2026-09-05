"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getDepartementByCode } from "@/lib/departements";
import { clearInscriptions } from "@/lib/actions/inscriptions";
import { formatNumber } from "@/lib/format";
import type { InscriptionsSummary } from "@/lib/inscriptions/types";

export function InscriptionsSummaryTable({
  summary,
}: {
  summary: InscriptionsSummary[];
}) {
  const router = useRouter();
  const [clearing, setClearing] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleClear(departementCode: string) {
    setPending(true);
    const result = await clearInscriptions({ departementCode });
    setPending(false);
    setClearing(null);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Liste vidée.");
    router.refresh();
  }

  const clearingDepartement = clearing ? getDepartementByCode(clearing) : null;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Département</TableHead>
            <TableHead className="text-right">Inscrits importés</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary.map((row) => {
            const departement = getDepartementByCode(row.departementCode);
            return (
              <TableRow key={row.departementCode}>
                <TableCell className="font-medium">
                  {departement?.nom ?? row.departementCode}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(row.count)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={row.count === 0}
                    onClick={() => setClearing(row.departementCode)}
                  >
                    Vider
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog
        open={clearing !== null}
        onOpenChange={(open) => !open && setClearing(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Vider la liste {clearingDepartement?.nom ?? ""} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les inscriptions importées pour ce département (année en cours)
              seront supprimées. Un candidat déjà admis ne pourra plus vérifier son
              inscription tant qu&apos;un nouvel import n&apos;est pas fait. Cette action
              est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() => clearing && handleClear(clearing)}
            >
              Vider
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
