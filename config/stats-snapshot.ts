/**
 * Dernières valeurs RÉELLES des compteurs publics, relevées le 2026-08-23
 * dans le Data Cache de Next.js — les réponses des RPC Supabase mémorisées
 * avant la suspension du projet pour dépassement de quota d'egress.
 *
 * Le total est recoupé par deux ventilations indépendantes, qui tombent
 * exactement dessus :
 *   par département  807 + 608 + 505 + 207 + 188 = 2315
 *   par année       1252 + 1062 + 1              = 2315
 *
 * Rôle : repli d'affichage pour la page d'accueil quand Supabase est
 * injoignable. Un compteur cumulatif ne décroît jamais — afficher la
 * dernière valeur connue reste donc exact (c'est un minorant du vrai
 * total), là où « 0 » serait faux et « — » ferait douter de la crédibilité
 * du site.
 *
 * Ne s'applique QU'AU SITE PUBLIC. Le dashboard admin continue d'afficher
 * « — » quand la lecture échoue : l'exploitant doit voir l'état réel du
 * service, jamais un repli.
 *
 * `examViews` vaut `null` faute de valeur fiable : le total des vues passe
 * par une requête HEAD (`count: "exact"`) que Next ne met pas en cache, elle
 * n'était donc pas récupérable. Aucun chiffre n'a été inventé — la tuile
 * « Vues des épreuves » affichera « — » jusqu'au rétablissement.
 *
 * À réactualiser (ou supprimer) dès que Supabase répond de nouveau : les
 * valeurs live reprennent automatiquement le dessus, ce repli redevient
 * inerte.
 */
export const PUBLIC_STATS_SNAPSHOT: {
  capturedAt: string;
  totalDownloads: number;
  examViews: number | null;
} = {
  capturedAt: "2026-08-23",
  totalDownloads: 2315,
  examViews: null,
};

/**
 * Valeur à afficher pour un compteur cumulatif public : la lecture live si
 * elle existe, l'instantané sinon — et jamais moins que l'instantané.
 *
 * Le plancher compte autant que le repli. Un compteur qui *redescend* sous
 * un chiffre déjà affiché aux candidats détruit la crédibilité bien plus
 * sûrement qu'un chiffre un peu daté ; ça arriverait mécaniquement si la
 * valeur figée provient d'une source qui compte plus large que la base
 * (GA4 comptabilise chaque consultation, `exam_document_views` en retient
 * une par IP et par demi-heure).
 *
 * `null` des deux côtés = rien de fiable à montrer : l'appelant affiche `—`.
 */
export function publicCount(live: number | null, snapshot: number | null): number | null {
  if (live === null) return snapshot;
  if (snapshot === null) return live;
  return Math.max(live, snapshot);
}
