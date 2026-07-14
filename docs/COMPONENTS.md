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

| Composant           | Type      | Rôle                                                                                         |
| ------------------- | --------- | -------------------------------------------------------------------------------------------- |
| `Navbar`            | client    | Logo (mark recadré), nav principale, CTA "Partager", menu mobile (Sheet)                     |
| `Footer`            | server    | Logo complet, liens filières/navigation, mention non-affiliation                             |
| `FiliereCard`       | server    | Carte filière (nom, description, nb documents, lien archives)                                |
| `DocumentCard`      | server    | Carte document (bibliothèque) : badges, stats, `PreviewDialog` + `DownloadButton`            |
| `StatsSection`      | server    | 3 tuiles stats globales (page d'accueil)                                                     |
| `CompletenessBadge` | server    | Badge `x/8 fichiers` + "Documents manquants" si incomplet                                    |
| `LibraryFilters`    | client    | Recherche + filtres (filière/année/matière), pilotés par l'URL (`searchParams`)              |
| `Pagination`        | isomorphe | Pagination générique (voir plus bas) — mode lien (`renderHref`) ou callback (`onPageChange`) |
| `FiliereYearsList`  | client    | Liste paginée (en mémoire) des années d'une filière                                          |
| `DownloadButton`    | client    | Appelle `getDownloadUrl`, redirige vers l'URL signée                                         |
| `PreviewDialog`     | client    | Dialogue + `<iframe>` PDF via `getPreviewUrl` (docs approuvés uniquement)                    |
| `ContributionForm`  | client    | Formulaire d'upload (React Hook Form + Zod), soumet à `submitDocument`                       |

**Props clé à connaître :**

- `DocumentCard` / `PreviewDialog` / `DownloadButton` prennent tous un
  `documentId: string` (uuid) — jamais l'objet document complet côté client,
  pour ne pas exposer plus que nécessaire.
- `LibraryFilters` lit/écrit l'URL (`useSearchParams`/`useRouter`) plutôt
  que de garder un état local : les filtres sont donc partageables par lien
  et fonctionnent avec le bouton retour du navigateur. `Pagination`, en mode
  lien (`renderHref`), suit le même principe pour la page courante.

## `components/admin/` (tableau de bord)

| Composant           | Type   | Rôle                                                                                        |
| ------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `LoginForm`         | client | Formulaire connexion (`useActionState` + `signIn`)                                          |
| `SignOutButton`     | client | Déconnexion (`signOut`)                                                                     |
| `AdminDashboard`    | client | Cœur du tableau de bord : onglets statut, recherche, table, pagination (React Query)        |
| `ContributorsTable` | client | Liste paginée des contributeurs (`/admin/contributeurs`), même pattern que `AdminDashboard` |
| `StatusBadge`       | server | Badge `pending`/`approved`/`rejected`                                                       |
| `PdfPreviewDialog`  | client | Aperçu PDF admin (bypass `approved`, via `getAdminPreviewUrl`)                              |
| `RejectDialog`      | client | Dialogue de refus avec motif obligatoire (≥ 5 caractères)                                   |
| `DeleteDialog`      | client | `AlertDialog` de confirmation avant suppression définitive                                  |

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

## `Pagination` : un seul composant, deux modes

`components/shared/pagination.tsx` est utilisé aussi bien par des Server
Components (bibliothèque) que des Client Components (`AdminDashboard`,
`ContributorsTable`, `FiliereYearsList`) — sans directive `"use client"`
lui-même, il s'adapte au contexte de l'appelant :

- **Mode lien** (`renderHref: (page) => string`) : pour une page publique où
  la pagination doit être une vraie navigation (URL partageable, retour
  navigateur). Utilisé par `/bibliotheque`.
- **Mode callback** (`onPageChange: (page) => void`) : pour un tableau
  piloté par React Query où changer de page ne doit pas recharger la page ni
  changer l'URL. Utilisé par `AdminDashboard` et `ContributorsTable`, en
  général via le hook `usePagination` (`lib/hooks/use-pagination.ts`) qui
  fournit `page`, `pageCount`, `setPage`, etc.

Voir `docs/PERFORMANCE.md#pagination` pour la justification des choix
techniques (LIMIT/OFFSET, stratégie de comptage, index).

## Ajouter un nouveau composant

1. `components/ui/` : nouveau composant shadcn → `npx shadcn@latest add <nom>`.
2. Composant public réutilisable sur plusieurs pages → `components/shared/`.
3. Spécifique au tableau de bord admin → `components/admin/`.
4. Server Component par défaut ; n'ajoutez `"use client"` que si vous avez
   besoin d'un hook React (`useState`, `useEffect`, `useForm`...), d'un
   gestionnaire d'événement, ou d'une API navigateur.
