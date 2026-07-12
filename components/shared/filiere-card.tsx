import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import type { FiliereWithCount } from "@/lib/data/filieres";

export function FiliereCard({ filiere }: { filiere: FiliereWithCount }) {
  return (
    <Card className="group flex h-full flex-col justify-between transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xl">{filiere.nom}</CardTitle>
          <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-semibold">
            {filiere.code.toUpperCase()}
          </span>
        </div>
        <CardDescription className="line-clamp-3">{filiere.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <FileText className="size-4" aria-hidden="true" />
          <span>
            {formatNumber(filiere.documentCount)} sujet
            {filiere.documentCount > 1 ? "s" : ""} disponible
            {filiere.documentCount > 1 ? "s" : ""}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild variant="secondary" className="w-full">
          <Link href={`/filieres/${filiere.code}`}>
            Voir les archives
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
