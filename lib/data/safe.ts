import "server-only";

/**
 * Exécute un fetch Supabase utilisé pendant le prerendering statique
 * (pages sans API dynamique : accueil, index filières, contribution) et
 * retombe sur une valeur par défaut si la base est injoignable — typiquement
 * en CI, où aucun projet Supabase réel n'est configuré. Les pages réellement
 * dynamiques (bibliothèque, filière/année, admin) ne passent pas par ici :
 * une vraie panne y remonte normalement.
 */
export async function withBuildTimeFallback<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.warn(
      "Supabase injoignable au build, utilisation d'une valeur par défaut:",
      error instanceof Error ? error.message : error
    );
    return fallback;
  }
}
