# Composants

Trois familles : `components/ui/` (shadcn, généré), `components/shared/`
(public), `components/admin/` (tableau de bord). Voir
[ARCHITECTURE.md](ARCHITECTURE.md) pour la philosophie générale (Server vs
Client Components).

## `components/ui/`

Généré par shadcn/ui (`npx shadcn@latest add <nom>`). **Ne pas éditer à la
main** — si un ajustement de style est nécessaire, préférez surcharger via
`className` depuis l'appelant, ou relancez la commande `add` pour
régénérer. Le projet utilise la base **Radix** (pas Base UI) : les
composants composables (`Button`, `DialogTrigger`, etc.) supportent la prop
`asChild`.

## `components/shared/` (public)

| Composant            | Type   | Rôle                                                                              |
| -------------------- | ------ | --------------------------------------------------------------------------------- |
| `Navbar`             | client | Logo (mark recadré), nav principale, CTA "Partager", menu mobile (Sheet)          |
| `Footer`             | server | Logo complet, liens filières/navigation, mention non-affiliation                  |
| `FiliereCard`        | server | Carte filière (nom, description, nb documents, lien archives)                     |
| `DocumentCard`       | server | Carte document (bibliothèque) : badges, stats, `PreviewDialog` + `DownloadButton` |
| `StatsSection`       | server | 3 tuiles stats globales (page d'accueil)                                          |
| `CompletenessBadge`  | server | Badge `x/8 fichiers` + "Documents manquants" si incomplet                         |
| `LibraryFilters`     | client | Recherche + filtres (filière/année/matière), pilotés par l'URL (`searchParams`)   |
| `PaginationControls` | client | Pagination bibliothèque, liens `?page=n` (préserve les autres filtres)            |
| `DownloadButton`     | client | Appelle `getDownloadUrl`, redirige vers l'URL signée                              |
| `PreviewDialog`      | client | Dialogue + `<iframe>` PDF via `getPreviewUrl` (docs approuvés uniquement)         |
| `ContributionForm`   | client | Formulaire d'upload (React Hook Form + Zod), soumet à `submitDocument`            |

**Props clé à connaître :**

- `DocumentCard` / `PreviewDialog` / `DownloadButton` prennent tous un
  `documentId: string` (uuid) — jamais l'objet document complet côté client,
  pour ne pas exposer plus que nécessaire.
- `LibraryFilters` et `PaginationControls` lisent/écrivent l'URL
  (`useSearchParams`/`useRouter`) plutôt que de garder un état local : les
  filtres sont donc partageables par lien et fonctionnent avec le bouton
  retour du navigateur.

## `components/admin/` (tableau de bord)

| Composant                 | Type   | Rôle                                                                                 |
| ------------------------- | ------ | ------------------------------------------------------------------------------------ |
| `LoginForm`               | client | Formulaire connexion (`useActionState` + `signIn`)                                   |
| `SignOutButton`           | client | Déconnexion (`signOut`)                                                              |
| `AdminDashboard`          | client | Cœur du tableau de bord : onglets statut, recherche, table, pagination (React Query) |
| `StatusBadge`             | server | Badge `pending`/`approved`/`rejected`                                                |
| `PdfPreviewDialog`        | client | Aperçu PDF admin (bypass `approved`, via `getAdminPreviewUrl`)                       |
| `RejectDialog`            | client | Dialogue de refus avec motif obligatoire (≥ 5 caractères)                            |
| `DeleteDialog`            | client | `AlertDialog` de confirmation avant suppression définitive                           |
| `PaginationControlsLocal` | client | Pagination pilotée par état React local (pas l'URL), pour le tableau admin           |

`AdminDashboard` est le seul composant du projet à utiliser **React Query**
(`useQuery`/`useMutation`) — voir [ARCHITECTURE.md](ARCHITECTURE.md#hooks)
pour la justification (données qui changent après une mutation, sans
navigation de page).

## Composants publics vs admin : pourquoi deux dossiers de "preview" ?

`components/shared/preview-dialog.tsx` (public, via `getPreviewUrl` —
documents `approved` uniquement) et `components/admin/pdf-preview-dialog.tsx`
(admin, via `getAdminPreviewUrl` — n'importe quel statut) partagent la même
UI (Dialog + iframe) mais **pas** la même autorisation. Ce sont deux petits
composants distincts plutôt qu'une abstraction commune, pour que
l'autorisation (quel document peut être prévisualisé par qui) reste
explicite et facile à auditer dans chaque fichier.

## Ajouter un nouveau composant

1. `components/ui/` : nouveau composant shadcn → `npx shadcn@latest add <nom>`.
2. Composant public réutilisable sur plusieurs pages → `components/shared/`.
3. Spécifique au tableau de bord admin → `components/admin/`.
4. Server Component par défaut ; n'ajoutez `"use client"` que si vous avez
   besoin d'un hook React (`useState`, `useEffect`, `useForm`...), d'un
   gestionnaire d'événement, ou d'une API navigateur.
