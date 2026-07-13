# Archives Concours UAM

![CI](https://github.com/thiamyatma/archives-concours-uam/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

Plateforme communautaire et gratuite pour consulter, télécharger et partager les
anciennes épreuves du concours d'entrée de l'Université Amadou Mahtar Mbow (UAM).

> Retrouvez gratuitement les anciennes épreuves des concours d'entrée de l'UAM.

## Sommaire

- [Présentation](#présentation)
- [Technologies utilisées](#technologies-utilisées)
- [Installation](#installation)
- [Lancement en développement](#lancement-en-développement)
- [Variables d'environnement](#variables-denvironnement)
- [Configuration Supabase](#configuration-supabase)
- [Notification email (optionnel)](#notification-email-optionnel)
- [Qualité du code](#qualité-du-code)
- [Déploiement](#déploiement-sur-vercel)
- [Structure du projet](#structure-du-projet)
- [Modèle de données](#modèle-de-données)
- [Sécurité](#sécurité)
- [Documentation technique](#documentation-technique)
- [Contribuer](#contribuer)

## Présentation

Archives Concours UAM permet aux futurs candidats du concours d'entrée de
l'UAM de :

- **Parcourir** les anciennes épreuves par filière, année et matière
- **Télécharger** gratuitement les sujets et corrigés en PDF
- **Prévisualiser** un document avant de le télécharger
- **Partager** une nouvelle épreuve (soumise en modération avant publication)
- Repérer d'un coup d'œil les **archives incomplètes** (badge "Documents
  manquants" quand une session n'a pas ses 8 fichiers)

Cinq filières sont couvertes : **DSTI, DGAE, DSTAN, DU2ADT, DGO**. Un
tableau de bord admin (`/admin`) permet de valider, refuser ou supprimer les
contributions, avec notification email à chaque nouvelle soumission.

Le site n'est **pas affilié officiellement** à l'administration de l'UAM —
c'est une initiative communautaire.

## Technologies utilisées

| Domaine              | Choix                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------- |
| Framework            | [Next.js 15](https://nextjs.org) (App Router, Server Components, Server Actions)        |
| Langage              | TypeScript strict                                                                       |
| UI                   | [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (Radix) |
| Backend / données    | [Supabase](https://supabase.com) (PostgreSQL, Auth, Storage, RLS)                       |
| Données côté client  | [TanStack React Query](https://tanstack.com/query) (tableau de bord admin)              |
| Formulaires          | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev)                 |
| Email transactionnel | [Resend](https://resend.com)                                                            |
| Icônes               | [Lucide](https://lucide.dev)                                                            |
| Qualité de code      | ESLint, Prettier, Husky, lint-staged                                                    |
| Tests                | [Vitest](https://vitest.dev)                                                            |
| CI                   | GitHub Actions                                                                          |

## Installation

Prérequis : **Node.js ≥ 20**, un compte [Supabase](https://supabase.com)
(gratuit).

```bash
git clone https://github.com/thiamyatma/archives-concours-uam.git
cd archives-concours-uam
npm install
cp .env.example .env.local
```

Puis complétez `.env.local` (voir [Variables d'environnement](#variables-denvironnement))
et suivez [Configuration Supabase](#configuration-supabase) — une fois fait,
comptez moins de 5 minutes jusqu'au `npm run dev`.

## Lancement en développement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) (ou le port suivant
libre si 3000 est déjà pris — Next l'indique dans le terminal).

## Variables d'environnement

Copier `.env.example` vers `.env.local` et renseigner :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RESEND_API_KEY=re_...
ADMIN_NOTIFICATION_EMAIL=admin@example.com
```

| Variable                        | Requise | Rôle                                                               |
| ------------------------------- | ------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | oui     | URL du projet Supabase                                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | oui     | Clé publique (RLS appliqué)                                        |
| `SUPABASE_SERVICE_ROLE_KEY`     | oui     | Clé serveur (⚠️ secret) — URLs signées de téléchargement/aperçu    |
| `NEXT_PUBLIC_SITE_URL`          | non     | Base URL pour metadata/sitemap/OG (défaut `http://localhost:3000`) |
| `RESEND_API_KEY`                | non     | Active la notification email admin                                 |
| `ADMIN_NOTIFICATION_EMAIL`      | non     | Destinataire de la notification de nouvelle contribution           |

## Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans l'éditeur SQL du projet, exécuter dans l'ordre :
   - `supabase/schema.sql` (tables, enums, RLS, bucket Storage, fonctions RPC)
   - `supabase/seed.sql` (les 5 filières)
3. Créer au moins un compte administrateur : **Authentication → Users → Add user**
   (email + mot de passe). Tout utilisateur authentifié est considéré admin par les
   policies RLS de ce projet — ne créez que des comptes de confiance.
4. Récupérer les clés dans **Project Settings → API** :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secret, jamais côté client)

## Notification email (optionnel)

Quand un contributeur soumet un document, l'admin reçoit un email (via
[Resend](https://resend.com)) l'invitant à valider/refuser dans `/admin`.

1. Créer un compte sur [resend.com](https://resend.com) (gratuit, 3000 emails/mois).
2. Récupérer une clé API : **API Keys → Create API Key**.
3. En test, l'expéditeur `onboarding@resend.dev` fonctionne sans configuration
   supplémentaire. En production, vérifiez votre propre domaine (**Domains →
   Add Domain**) et mettez à jour l'adresse `from` dans `lib/email.ts`.
4. Si `RESEND_API_KEY` ou `ADMIN_NOTIFICATION_EMAIL` est absent, la notification
   est simplement ignorée (log console) — la contribution elle-même n'est jamais
   bloquée par un échec d'email.

## Qualité du code

```bash
npm run lint          # ESLint (règles Next.js + TypeScript)
npm run lint:fix       # Corrige automatiquement ce qui peut l'être
npm run format         # Formate tout le repo avec Prettier
npm run format:check   # Vérifie le formatage sans modifier
npm run type-check     # tsc --noEmit
npm run test           # Vitest (tests unitaires sur lib/)
npm run build          # Build de production
```

- **Husky + lint-staged** : à chaque `git commit`, ESLint (`--fix`) et Prettier
  tournent sur les fichiers modifiés, puis `type-check` s'exécute sur tout le
  projet. Un commit qui casse le lint ou le typage est bloqué (voir
  `.husky/pre-commit`).
- **GitHub Actions** (`.github/workflows/ci.yml`) : à chaque Pull Request et
  push sur `main`, 4 jobs tournent en parallèle — lint, type-check, tests,
  build. Le build utilise des identifiants Supabase factices (voir
  `lib/data/safe.ts`) : aucun secret réel n'est nécessaire pour que la CI
  passe.

## Déploiement sur Vercel

1. Pousser le dépôt sur GitHub/GitLab/Bitbucket.
2. Sur [vercel.com/new](https://vercel.com/new), importer le dépôt.
3. Renseigner les variables d'environnement (Project Settings → Environment
   Variables) avec les mêmes valeurs que `.env.local`, pour les environnements
   Production et Preview :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (ex : `https://archives-concours-uam.vercel.app`)
   - `RESEND_API_KEY` et `ADMIN_NOTIFICATION_EMAIL` (optionnel, notifications email)
4. Déployer. Le schéma + seed SQL doivent déjà avoir été appliqués sur le
   projet Supabase avant le déploiement (voir [Configuration Supabase](#configuration-supabase)).
5. Vérifier après déploiement :
   - `/sitemap.xml` et `/robots.txt` accessibles
   - Connexion admin sur `/admin/login`
   - Upload d'un document test via `/contribuer`, puis validation dans `/admin`

## Structure du projet

```
app/
  page.tsx                          Accueil (hero, stats, filières)
  bibliotheque/page.tsx             Recherche + filtres + pagination
  filieres/page.tsx                 Index des 5 filières
  filieres/[code]/page.tsx         Détail filière + années disponibles
  filieres/[code]/[annee]/page.tsx Documents d'une session (4 matières)
  contribuer/page.tsx               Formulaire de contribution (upload PDF)
  admin/login/page.tsx              Connexion admin (Supabase Auth)
  admin/(dashboard)/page.tsx        Tableau de bord (validation/refus/suppression)
  sitemap.ts / robots.ts            SEO
  opengraph-image.tsx               Image Open Graph générée dynamiquement

components/
  ui/                               Composants shadcn/ui (générés, éviter de modifier à la main)
  shared/                           Navbar, Footer, cartes, filtres, formulaire, aperçu PDF
  admin/                            Tableau, dialogues, aperçu PDF admin

lib/
  supabase/                         Clients (browser, server, middleware, service role)
  data/                             Lecture Supabase (Server Components uniquement)
  actions/                          Server Actions (contribution, téléchargement, aperçu, admin, auth)
  validations/                      Schémas Zod
  email.ts                          Notification admin (Resend)
  constants.ts, format.ts, completeness.ts, env.ts

supabase/
  schema.sql                        Tables, enums, RLS, storage, RPC
  seed.sql                          Les 5 filières (DSTI, DGAE, DSTAN, DU2ADT, DGO)
  migrations/                       Historique des migrations appliquées (Supabase CLI)

types/database.ts                   Types générés à la main (Database, Tables, Enums)

docs/                                Documentation technique (architecture, données, composants)

.github/                             Workflows CI, templates issues/PR
.husky/                              Git hooks (pre-commit)
```

## Modèle de données

| Table          | Rôle                                                          |
| -------------- | ------------------------------------------------------------- |
| `filieres`     | Les 5 filières du concours                                    |
| `documents`    | Sujets/corrigés (`status`: `pending` → `approved`/`rejected`) |
| `contributors` | Nom/email optionnels des contributeurs                        |
| `reports`      | Signalements communautaires sur un document publié            |

Un concours complet = 4 matières (Mathématiques, Physique-Chimie, Anglais, Logique)
× 2 types (sujet, corrigé) = **8 fichiers**. Les années incomplètes affichent un
badge « Documents manquants » (voir `lib/completeness.ts`).

Les PDF sont stockés dans un **bucket Supabase Storage privé** (`documents`). Le
téléchargement et l'aperçu publics passent systématiquement par une Server
Action qui génère une URL signée de courte durée ; le téléchargement
incrémente en plus le compteur de façon atomique (RPC
`increment_document_downloads`, `SECURITY DEFINER`) — jamais d'accès direct
au bucket.

Détail complet du schéma : [docs/DATABASE.md](docs/DATABASE.md).

## Sécurité

- RLS activé sur toutes les tables ; seuls les documents `approved` sont lisibles
  publiquement, le reste nécessite une session authentifiée (admin).
- Le bucket Storage est privé ; tout accès (téléchargement public, aperçu)
  passe par une URL signée à courte durée de vie générée côté serveur.
- La clé `service_role` n'est utilisée que dans des modules serveur marqués
  `server-only` (`lib/supabase/service.ts`), jamais exposée au client.
- Validation Zod côté client (UX) **et** côté serveur (Server Actions) — jamais de
  confiance aveugle dans les données envoyées par le navigateur.
- Vulnérabilité trouvée ? Voir [SECURITY.md](SECURITY.md) pour la procédure de
  signalement responsable.

## Documentation technique

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — vue d'ensemble, flux de
  données Server Components / Server Actions, composants partagés
- [docs/DATABASE.md](docs/DATABASE.md) — schéma Supabase détaillé, RLS,
  storage, RPC
- [docs/COMPONENTS.md](docs/COMPONENTS.md) — composants réutilisables et
  quand les utiliser
- [docs/PERFORMANCE.md](docs/PERFORMANCE.md) — cache, index SQL, pagination,
  lazy loading : chaque optimisation de scalabilité et sa justification

## Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour le guide complet (branches,
commits, Pull Requests, revue de code). Ce projet suit un
[Code de conduite](CODE_OF_CONDUCT.md) — merci de le respecter.

Projet sous licence [MIT](LICENSE).
