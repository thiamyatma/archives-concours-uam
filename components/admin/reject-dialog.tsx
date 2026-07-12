"use client";

import { useState } from "react";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RejectDialog({
  onConfirm,
  isPending,
}: {
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setReason("");
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <XCircle className="size-4" aria-hidden="true" />
          Refuser
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refuser ce document</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reject-reason">Motif du refus</Label>
          <Textarea
            id="reject-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex : document illisible, doublon, mauvaise filière..."
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={reason.trim().length < 5 || isPending}
            onClick={() => {
              onConfirm(reason.trim());
              setOpen(false);
              setReason("");
            }}
          >
            Confirmer le refus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
