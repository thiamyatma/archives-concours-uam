"use client";

import { Button } from "@/components/ui/button";
import type { Consent } from "@/lib/analytics/consent";

/**
 * Bannière de consentement affichée tant que l'utilisateur n'a pas choisi.
 * Le tracking GA ne démarre qu'après « Accepter » (voir analytics.tsx).
 */
export function CookieConsentBanner({
  onChoice,
}: {
  onChoice: (choice: Consent) => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Consentement aux cookies"
      className="bg-background/95 fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-muted-foreground text-sm">
          Nous utilisons des cookies de mesure d&apos;audience (Google Analytics) pour
          comprendre l&apos;usage du site. Aucun cookie n&apos;est déposé sans votre
          accord.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => onChoice("denied")}>
            Refuser
          </Button>
          <Button size="sm" onClick={() => onChoice("granted")}>
            Accepter
          </Button>
        </div>
      </div>
    </div>
  );
}
