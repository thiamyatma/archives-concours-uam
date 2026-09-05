import type { Metadata } from "next";
import { VerificationForm } from "@/components/verification/verification-form";

export const metadata: Metadata = {
  title: "Je suis admis",
  description:
    "Vérifiez votre admission au concours d'entrée UAM et récupérez le lien du groupe WhatsApp de votre département.",
};

// Aucun contenu git-versionné/caché ici : chaque visite affiche le même
// formulaire, la vérification elle-même se fait au clic (Server Action),
// jamais au chargement de la page.

export default function VerificationPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <div className="mb-8 space-y-2 text-center">
        <h1 className="text-brand-blue text-3xl font-bold tracking-tight">
          Je suis admis
        </h1>
        <p className="text-muted-foreground text-sm">
          Cette vérification confirme uniquement que votre nom et votre email
          correspondent à la liste fournie par votre département — elle ne remplace pas la
          publication officielle des résultats.
        </p>
      </div>
      <VerificationForm />
    </div>
  );
}
