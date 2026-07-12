import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CompletenessBadge({ count, total }: { count: number; total: number }) {
  const isComplete = count >= total;

  return (
    <Badge
      variant={isComplete ? "secondary" : "outline"}
      className={
        isComplete
          ? "bg-primary/10 text-primary gap-1 border-transparent"
          : "gap-1 border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
      }
    >
      {isComplete ? (
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
      ) : (
        <AlertTriangle className="size-3.5" aria-hidden="true" />
      )}
      {count}/{total} fichiers{!isComplete && " — documents manquants"}
    </Badge>
  );
}
