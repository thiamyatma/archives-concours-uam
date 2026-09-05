"use client";

import { useActionState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyCandidate, type VerifyCandidateResult } from "@/lib/actions/inscriptions";

async function action(
  _prev: VerifyCandidateResult | null,
  formData: FormData
): Promise<VerifyCandidateResult> {
  const nom = String(formData.get("nom") ?? "");
  const email = String(formData.get("email") ?? "");
  return verifyCandidate({ nom, email });
}

/**
 * Formulaire "Je suis admis" (/verification) : nom + email, vérifiés contre
 * la liste importée par le département (lib/actions/inscriptions.ts). En
 * cas de succès, affiche le lien d'invitation WhatsApp du département
 * correspondant. Message d'erreur générique en cas d'échec — voir la note
 * de non-énumération dans verifyCandidate.
 */
export function VerificationForm() {
  const [result, formAction, pending] = useActionState<
    VerifyCandidateResult | null,
    FormData
  >(action, null);

  if (result && "success" in result) {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle>Inscription confirmée 🎉</CardTitle>
          <CardDescription>
            Vous êtes bien inscrit·e — département {result.departementNom}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg" className="w-full">
            <a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" aria-hidden="true" />
              Rejoindre le groupe WhatsApp {result.departementNom}
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Je suis admis</CardTitle>
        <CardDescription>
          Entrez le nom et l&apos;email utilisés lors de votre inscription au concours
          pour récupérer le lien d&apos;invitation du groupe WhatsApp de votre
          département.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom complet</Label>
            <Input id="nom" name="nom" autoComplete="name" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          {result && "error" in result && (
            <p className="text-destructive text-sm">{result.error}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Vérification…" : "Vérifier mon inscription"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
