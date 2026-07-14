"use client";

import { trackContact } from "@/lib/analytics/track";

/**
 * Lien e-mail de contact qui émet l'événement `contact` au clic. Remplace un
 * simple `<a href="mailto:">` là où l'on veut mesurer l'intention de contact
 * (footer). No-op analytics si GA n'est pas chargé — le mailto fonctionne
 * toujours.
 */
export function TrackContactLink({
  email,
  className,
}: {
  email: string;
  className?: string;
}) {
  return (
    <a href={`mailto:${email}`} className={className} onClick={() => trackContact()}>
      {email}
    </a>
  );
}
