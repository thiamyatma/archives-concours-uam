import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/constants";
import type { DocumentStatus } from "@/types/database";

const STYLES: Record<DocumentStatus, string> = {
  pending:
    "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  approved: "border-transparent bg-primary/10 text-primary",
  rejected: "border-transparent bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return <Badge className={STYLES[status]}>{STATUS_LABELS[status]}</Badge>;
}
