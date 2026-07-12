# Architecture

## Vue d'ensemble

Archives Concours UAM est une application **Next.js 15 App Router**. Le
principe directeur : **Server Components par défaut**, Client Components
seulement là où l'interactivité l'exige, et **Server Actions** pour toute
mutation (upload, validation admin, auth) — pas de couche API REST séparée.

```
Navigateur
   │
   ├─ Server Components (RSC) ──► lib/data/*.ts ──► Supabase (RLS, clé anon)
   │     rendu HTML direct, pas de JS client pour la donnée
   │
   ├─ Client Components ("use client")
   │     interactivité : formulaires, dialogues, filtres, tableau admin
   │     └─ appellent lib/actions/*.ts (Server Actions) pour toute mutation
   │
   └─ Server Actions ("use server") ──► lib/supabase/{server,service}.ts ──► Supabase
         valident (Zod) puis exécutent la mutation, jamais de logique
         métier dans les composants client
```

## Pourquoi pas de routes API classiques ?

Le projet n'a **pas de `app/api/*/route.ts`** pour la logique métier. Les
Server Actions (`lib/actions/`) remplacent les endpoints REST habituels :
elles s'appellent comme des fonctions depuis un composant client ou un
`<form action={...}>`, tournent uniquement côté serveur, et bénéficient du
typage de bout en bout (pas de sérialisation JSON manuelle, pas de contrat
d'API à maintenir séparément).

Les seules routes générées par convention de fichiers Next.js sont :

| Route              | Fichier                   | Rôle                                  |
| ------------------ | ------------------------- | ------------------------------------- |
| `/sitemap.xml`     | `app/sitemap.ts`          | Sitemap dynamique (filières + années) |
| `/robots.txt`      | `app/robots.ts`           | Règles robots + lien vers le sitemap  |
| `/opengraph-image` | `app/opengraph-image.tsx` | Image Open Graph générée à la volée   |
| `/twitter-image`   | `app/twitter-image.tsx`   | Réutilise `opengraph-image.tsx`       |
| `/icon.png`        | `app/icon.png`            | Favicon (mark du logo UAM)            |

Si un besoin futur nécessite une vraie route HTTP (webhook externe, endpoint
appelé par un service tiers), elle irait dans `app/api/<nom>/route.ts` — mais
ce n'est pas le pattern par défaut ici.

## "Services" : `lib/data/` vs `lib/actions/`

Le projet sépare strictement **lecture** et **écriture** :

- **`lib/data/*.ts`** — lecture seule, appelée uniquement depuis des Server
  Components (pages, layouts). Chaque fichier correspond à une "ressource" :
  - `filieres.ts` — filières + statistiques + complétude par année
  - `documents.ts` — recherche/pagination bibliothèque, documents admin
  - `stats.ts` — statistiques globales (RPC `get_global_stats`)
  - `safe.ts` — `withBuildTimeFallback`, garde-fou pour le prerendering
    statique (voir plus bas)

- **`lib/actions/*.ts`** — toute mutation, marquée `"use server"` :
  - `contribute.ts` — `submitDocument` (upload + insert, statut `pending`)
  - `download.ts` — `getDownloadUrl` (URL signée + incrément atomique)
  - `preview.ts` — `getPreviewUrl` (URL signée sans incrément, docs approuvés)
  - `admin.ts` — `approveDocument`, `rejectDocument`, `deleteDocument`,
    `getAdminPreviewUrl`, `fetchAdminDocuments`
  - `auth.ts` — `signIn`, `signOut` (Supabase Auth)

- **`lib/supabase/*.ts`** — les 4 façons de parler à Supabase :
  - `client.ts` — client browser (Client Components)
  - `server.ts` — client serveur lié aux cookies de session (RSC/Server
    Actions), avec repli automatique sans cookies hors requête HTTP
    (`generateStaticParams`, `sitemap.ts`)
  - `middleware.ts` — rafraîchit la session + protège `/admin/*`
  - `service.ts` — clé `service_role`, **jamais** importé côté client
    (protégé par le package `server-only`), utilisé uniquement pour générer
    des URLs signées

## Rendu statique et données au build

Certaines pages (accueil, index filières, page de contribution) sont
prerendables au build. Comme elles font de vraies requêtes Supabase, elles
passent par `withBuildTimeFallback()` (`lib/data/safe.ts`) : si Supabase est
injoignable (typiquement en CI, où aucun projet réel n'est configuré), la
page se construit quand même avec des données vides plutôt que de faire
échouer tout le build. En production, avec de vrais identifiants, les
données réelles s'affichent normalement dès le premier chargement (puis se
rafraîchissent via `revalidate`).

Les pages qui dépendent de l'utilisateur courant (tableau de bord admin,
`/admin`) sont explicitement `export const dynamic = "force-dynamic"` — elles
ne doivent jamais être mises en cache statique.

## Hooks

Le projet n'a pas encore de hooks React personnalisés (`lib/hooks/` n'existe
pas). L'interactivité s'appuie directement sur les hooks fournis par les
librairies du stack :

- `react-hook-form` (`useForm`) — formulaire de contribution
- `@tanstack/react-query` (`useQuery`, `useMutation`) — tableau de bord admin
  uniquement (`components/admin/admin-dashboard.tsx`)
- `react` (`useActionState`, `useTransition`, `useState`) — état des Server
  Actions, dialogues, filtres

Si un hook personnalisé devient nécessaire (logique réutilisée entre
plusieurs composants), le placer dans `lib/hooks/use-<nom>.ts`.

## Composants

Voir [COMPONENTS.md](COMPONENTS.md) pour le détail. En résumé :

- `components/ui/` — généré par shadcn/ui, ne pas éditer à la main (relancer
  `npx shadcn@latest add <composant>` pour mettre à jour)
- `components/shared/` — composants publics réutilisables (cartes, filtres,
  formulaire, boutons de téléchargement/aperçu)
- `components/admin/` — composants spécifiques au tableau de bord admin

## Middleware et authentification

`middleware.ts` (racine) délègue à `lib/supabase/middleware.ts` :

1. Rafraîchit la session Supabase sur chaque requête vers `/admin/*`.
2. Redirige vers `/admin/login` si aucune session sur une route protégée.
3. Redirige vers `/admin` si un utilisateur déjà connecté visite
   `/admin/login`.

Il n'y a pas de table de rôles séparée : **tout utilisateur Supabase Auth
authentifié est considéré admin** par les policies RLS. La création de
comptes admin se fait manuellement dans le Dashboard Supabase
(Authentication → Users) — voir le [README](../README.md#configuration-supabase).
