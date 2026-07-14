import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DepartementNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Introuvable</h1>
      <p className="text-muted-foreground mt-2">
        Ce département ou cette session n&apos;existe pas (encore) dans nos archives.
      </p>
      <Button asChild className="mt-6">
        <Link href="/departements">Voir les départements</Link>
      </Button>
    </div>
  );
}
