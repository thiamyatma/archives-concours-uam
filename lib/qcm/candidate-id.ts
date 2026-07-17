const STORAGE_KEY = "qcm_candidate_id";

/**
 * Identifiant anonyme de candidat, persisté en localStorage. Ce n'est PAS un
 * compte utilisateur : juste un jeton aléatoire propre à un navigateur, qui
 * permet de relier les tentatives d'un même appareil pour le suivi de
 * progression (voir docs/qcm-entrainement.md). À appeler uniquement côté
 * client (accède à `window.localStorage`).
 */
export function getOrCreateCandidateId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // localStorage indisponible (mode privé strict, quota…) : jeton éphémère,
    // non persisté — la tentative sera comptée mais non rattachable ensuite.
    return `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}
