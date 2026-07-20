"use client";

import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackPartnerCallClick, trackPartnerSignupClick } from "@/lib/analytics/track";

/**
 * Seul îlot client de l'encart partenaire (voir thiam-sciences-promo.tsx,
 * Server Component) : juste assez pour mesurer les clics sur les deux CTA
 * (inscription, appel), au même titre que les téléchargements/vues déjà
 * suivis ailleurs sur le site.
 */
export function ThiamSciencesCtaButtons({
  registrationUrl,
  phoneDisplay,
  phoneHref,
}: {
  registrationUrl: string;
  phoneDisplay: string;
  phoneHref: string;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <Button asChild size="lg">
        <a
          href={registrationUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackPartnerSignupClick()}
        >
          S&apos;inscrire maintenant
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </Button>
      <Button asChild size="lg" variant="outline">
        <a href={phoneHref} onClick={() => trackPartnerCallClick()}>
          <Phone className="size-4" aria-hidden="true" />
          {phoneDisplay}
        </a>
      </Button>
    </div>
  );
}
