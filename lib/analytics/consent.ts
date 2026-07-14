/**
 * Consentement cookies/analytics, persisté côté navigateur. Tant que le
 * choix n'est pas « granted », aucun script GA n'est chargé (voir
 * components/analytics/analytics.tsx).
 */
export type Consent = "granted" | "denied";

/** `null` = l'utilisateur n'a pas encore choisi (la bannière doit s'afficher). */
export type ConsentState = Consent | null;

export const CONSENT_STORAGE_KEY = "ga-consent";

/**
 * Valide une valeur brute de stockage en un `ConsentState`. Fonction pure
 * (testée), séparée des accès `window` ci-dessous qui, eux, ne sont que de
 * fines enveloppes non testables en environnement node.
 */
export function parseConsent(value: string | null): ConsentState {
  return value === "granted" || value === "denied" ? value : null;
}

/** Lit le choix persisté. Renvoie `null` côté serveur ou si aucun choix valide n'est stocké. */
export function readConsent(): ConsentState {
  if (typeof window === "undefined") return null;
  return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
}

/**
 * S'abonne aux changements de consentement (pour `useSyncExternalStore`).
 * Couvre l'autre onglet (événement `storage` natif) et le même onglet
 * (notre événement custom émis par `writeConsent`).
 */
export function subscribeConsent(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === CONSENT_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CONSENT_EVENT, listener);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CONSENT_EVENT, listener);
  };
}

const CONSENT_EVENT = "ga-consent-change";

/** Persiste le choix et notifie les abonnés du même onglet. No-op côté serveur. */
export function writeConsent(value: Consent): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  window.dispatchEvent(new Event(CONSENT_EVENT));
}
