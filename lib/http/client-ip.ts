/**
 * Extrait l'IP du visiteur à partir des en-têtes posés par la plateforme
 * d'hébergement (Vercel). Le premier maillon de `x-forwarded-for` peut être
 * fourni par le client lui-même (donc usurpable à volonté) ; seul le
 * *dernier* maillon est celui ajouté par le edge juste avant d'atteindre la
 * fonction, donc le seul auquel on peut faire confiance pour un rate-limit.
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const parts = forwardedFor.split(",");
    const last = parts[parts.length - 1]?.trim();
    if (last) return last;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}
