# Paramètres du concours (administrables)

Toutes les informations du concours affichées sur le site (compte à rebours,
bannière, messages, boutons, infos pratiques) sont **administrables** depuis
`/admin/parametres` et persistées dans Supabase — aucune date/texte n'est
codé en dur dans les composants.

## Comptes administrateurs

L'accès admin se fait par **compte email + mot de passe** (table `admin_users`),
et non plus par un mot de passe unique partagé.

- Mots de passe **hachés scrypt** (`lib/auth/password.ts`, sel aléatoire par
  compte, format `sel:hash`) — jamais stockés en clair. La migration ne seede
  que des hachés.
- `loginAdmin(email, password)` (`lib/actions/admin-auth.ts`) : recherche par
  email, vérification à temps constant, rate-limit (5 essais / 15 min).
- Le cookie de session (HMAC, clé = `ADMIN_PASSWORD` qui n'est plus qu'un
  **secret de signature**) embarque l'`id` de l'admin connecté. Révocation
  globale via `admin_session_state.revoked_at` (déconnexion).

## Modèle de données : `contest_settings` (singleton)

Une seule ligne (`id = true`, même pattern que `admin_session_state`).
Colonnes typées pour les scalaires + `jsonb` pour les groupes
(`messages`, `banner`, `countdown`, `buttons`, `info`). Voir
`supabase/migrations/20260722000000_contest_settings.sql`.

Les 4 dates (`registration_opens_at`, `registration_closes_at`,
`contest_date`, `results_date`, toutes nullables) pilotent la machine à états
(`lib/contest/status.ts`) : `before_registration` → `registration_open` →
`registration_closed` → `contest_day` → `after_contest` → `results_published`.

## Flux

1. **Lecture** (`lib/contest/settings.ts`) : `getContestSettings()` lit le
   singleton via le client service-role, mappe DB→domaine (dates en `Date`,
   groupes fusionnés avec les défauts `config/contest.ts`). Caché entre
   requêtes (`unstable_cache`, tag `contest-settings`) + dédupliqué dans la
   requête (`cache` React). Repli silencieux sur les défauts si la base est
   indisponible → le site public ne casse jamais. **Les `Date` sont
   reconstruites APRÈS le cache** (qui sérialise) — voir le commentaire du
   fichier.
2. **Écriture** (`lib/actions/contest-settings.ts`) : `updateContestSettings`
   — `requireAdminSession()` + validation **Zod** (`lib/contest/schema.ts`) +
   upsert du singleton + `revalidateTag("contest-settings")` +
   `revalidatePath("/")`. La page d'accueil reflète le changement au prochain
   rendu, sans redéploiement.
3. **Affichage public** : `app/page.tsx` (Server Component `async`) →
   `ContestBanner` + `ContestCountdown` alimentés par les paramètres.
   `useContestStatus` (horloge `useSyncExternalStore`, hydratation-safe)
   calcule phase/temps restant/progression.

## Page admin (`/admin/parametres`)

`ContestSettingsForm` (client) : **Tabs** (Général, Dates, Messages, Bannière,
Compte à rebours, Boutons, Infos) et un **aperçu en direct** (qui rend
`ContestBanner` et `ContestCountdown` sur l'état non encore enregistré).
Composants : `Tabs`, `Card`, `Input`, `Textarea`, `Select`, `Switch`,
`DateField` (Popover + Calendar + heure), `Toast`.

Les messages acceptent des jetons remplacés à l'affichage :
`{dateOuvertureInscriptions}`, `{dateClotureInscriptions}`, `{dateConcours}`,
`{dateResultats}` (voir `lib/contest/messages.ts`).

## Sécurité

- Page protégée par le layout `app/admin/(protected)/layout.tsx`
  (`requireAdminSession()`), et l'action re-vérifie la session elle-même.
- Toute la validation est **côté serveur** (Zod), jamais confiance au client.
- RLS activée, aucune policy publique : `admin_users` et `contest_settings`
  ne sont accessibles que par le service role.

## À venir (PR 2)

Historique des modifications (acteur = admin connecté, désormais identifié),
SEO (image OG par URL) câblé dans `generateMetadata`, toggles de statistiques,
widget flottant du compte à rebours (position gauche/droite, activation).
