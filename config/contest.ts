/**
 * Configuration centralisée du concours. Pour faire évoluer la section
 * "Concours" d'une année à l'autre (2027, 2028…), il suffit de modifier ce
 * fichier — aucun composant React n'a besoin d'être touché.
 *
 * Les dates sont volontairement exprimées sans suffixe de fuseau : elles sont
 * interprétées dans le fuseau du serveur de rendu (Vercel = UTC, ce qui
 * correspond à l'heure du Sénégal, GMT).
 */

export interface ContestConfig {
  /** Année du concours (affichée dans le titre et les libellés). */
  year: number;
  /** Date/heure limite d'inscription (incluse). */
  registrationDeadline: Date;
  /** Date/heure du concours (cible du compte à rebours). */
  contestDate: Date;
  /** Message affiché une fois le concours terminé. */
  resultsMessage: string;
}

export const CONTEST_CONFIG: ContestConfig = {
  year: 2026,
  registrationDeadline: new Date("2026-08-16T23:59:59"),
  contestDate: new Date("2026-08-22T08:00:00"),
  resultsMessage: "Les résultats seront publiés prochainement.",
};

/**
 * Point d'accès unique à la configuration du concours. Aujourd'hui, renvoie
 * simplement la constante statique ci-dessus.
 *
 * Évolution prévue (admin/Supabase) : pour rendre les dates modifiables
 * depuis le tableau de bord sans redéployer, il suffira de remplacer le corps
 * de cette fonction par une lecture Supabase (dans un Server Component ou une
 * Server Action). La page d'accueil, déjà Server Component, passe la config
 * en prop au composant client `ContestCountdown` — ni le hook
 * `useContestStatus` ni le composant n'ont donc à être modifiés le jour où
 * la source devient la base de données. Les objets `Date` sont sérialisables
 * à travers la frontière Server → Client de Next.js.
 */
export function getContestConfig(): ContestConfig {
  return CONTEST_CONFIG;
}
