# Archives Concours UAM

![CI](https://github.com/thiamyatma/archives-concours-uam/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

Plateforme gratuite pour consulter les anciennes épreuves du concours d'entrée
de l'Université Amadou Mahtar Mbow (UAM), classées par département et par année.

> Retrouvez gratuitement les anciennes épreuves des concours d'entrée de l'UAM.

## Sommaire

- [Présentation](#présentation)
- [Technologies utilisées](#technologies-utilisées)
- [Installation](#installation)
- [Lancement en développement](#lancement-en-développement)
- [Variables d'environnement](#variables-denvironnement)
- [Configuration Supabase](#configuration-supabase)
- [Ajouter une nouvelle épreuve](#ajouter-une-nouvelle-épreuve)
- [Qualité du code](#qualité-du-code)
- [Déploiement](#déploiement-sur-vercel)
- [Structure du projet](#structure-du-projet)
- [Sécurité](#sécurité)
- [Documentation technique](#documentation-technique)
- [Contribuer](#contribuer)

## Présentation

Archives Concours UAM permet aux futurs candidats du concours d'entrée de
l'UAM de :

- **Parcourir** les archives par département et par année
- **Lire** directement une épreuve dans le navigateur (Markdown rendu, avec
  formules scientifiques via KaTeX) — aucun téléchargement de fichier
- Les matières d'une épreuve apparaissent chacune dans leur propre section

Cinq départements sont couverts : **DSTI, DGAE, DSTAAN, DU2ADT, DGO**. DSTI,
DGAE et DSTAAN partagent certaines années la même épreuve — le contenu n'est
alors stocké qu'une seule fois (voir [Ajouter une nouvelle épreuve](#ajouter-une-nouvelle-épreuve)).

Le contenu des archives est **git-versionné** (`content/archives/**`), pas
stocké en base de données : ajouter une nouvelle session ne nécessite ni
compte admin, ni upload, juste un fichier Markdown au bon endroit.

Le site n'est **pas affilié officiellement** à l'administration de l'UAM —
c'est une initiative communautaire.

## Technologies utilisées

| Domaine         | Choix                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| Framework       | [Next.js 15](https://nextjs.org) (App Router, Server Components, rendu 100% statique)                              |
| Langage         | TypeScript strict                                                                                                  |
| UI              | [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (Radix)                            |
| Rendu Markdown  | [react-markdown](https://github.com/remarkjs/react-markdown) + remark-gfm/remark-math + [KaTeX](https://katex.org) |
| Assistant IA    | [Supabase](https://supabase.com) (Postgres full-text) + [Groq](https://groq.com)                                   |
| Icônes          | [Lucide](https://lucide.dev)                                                                                       |
| Qualité de code | ESLint, Prettier, Husky, lint-staged                                                                               |
| Tests           | [Vitest](https://vitest.dev)                                                                                       |
| CI              | GitHub Actions                                                                                                     |

## Installation

Prérequis : **Node.js ≥ 20**. Un compte [Supabase](https://supabase.com)
(gratuit) est nécessaire uniquement pour l'assistant IA — le reste du site
(départements, archives) ne dépend d'aucune base de données.

```bash
git clone https://github.com/thiamyatma/archives-concours-uam.git
cd archives-concours-uam
npm install
cp .env.example .env.local
```

## Lancement en développement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) (ou le port suivant
libre si 3000 est déjà pris — Next l'indique dans le terminal).

## Variables d'environnement

Copier `.env.example` vers `.env.local`. Aucune variable n'est requise pour
parcourir les départements/archives ; les variables Supabase/Groq
n'activent que l'assistant IA (voir [docs/RAG.md](docs/RAG.md)).

| Variable                        | Requise             | Rôle                                                               |
| ------------------------------- | ------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | pour l'assistant IA | URL du projet Supabase                                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pour l'assistant IA | Clé publique (RLS appliqué)                                        |
| `SUPABASE_SERVICE_ROLE_KEY`     | pour l'assistant IA | Clé serveur (⚠️ secret) — recherche RAG, rate-limiting             |
| `NEXT_PUBLIC_SITE_URL`          | non                 | Base URL pour metadata/sitemap/OG (défaut `http://localhost:3000`) |
| `GROQ_API_KEY`                  | pour l'assistant IA | Génération des réponses de l'assistant                             |

## Configuration Supabase

Uniquement nécessaire pour activer l'assistant IA (le reste du site
fonctionne sans aucune base de données) :

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans l'éditeur SQL du projet, exécuter `supabase/schema.sql`.
3. Récupérer les clés dans **Project Settings → API** :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secret, jamais côté client)

## Ajouter une nouvelle épreuve

Aucun compte admin ni upload : déposer un fichier Markdown puis déployer.

1. **Partir du modèle** [`content/archives/_TEMPLATE.md`](content/archives/_TEMPLATE.md)
   — il fixe la structure exacte à respecter pour que le rendu (titres en
   bleu logo UAM, en-tête centré, sections agrandies, formules KaTeX) soit
   identique à toutes les autres épreuves. Le style est appliqué
   automatiquement : **ne rien styliser à la main dans le `.md`**.
2. Le copier vers le dossier du département (voir `lib/departements.ts`
   pour la table code → dossier) : `content/archives/<groupe-ou-code>/<année>.md`.
   Ex. une épreuve partagée par DSTI/DGAE/DSTAAN va dans
   `content/archives/dsti-dgae-dstaan/<année>.md` ; une épreuve propre à
   DU2ADT va dans `content/archives/du2adt/<année>.md`.
3. Remplir le contenu en gardant la structure : un titre `# ...`, un
   en-tête (école/durée/départements), puis une section `## ÉPREUVE DE
<matière>` par matière (voir `content/archives/dsti-dgae-dstaan/2025.md`
   pour un exemple rempli).
4. Committer, pousser, déployer — l'application détecte automatiquement le
   département (dossier), l'année (nom de fichier) et le titre (premier
   titre du fichier), sans aucune modification de code.

Détail de la résolution de contenu (override propre à un département vs
partagé) et du rendu (réparation LaTeX, KaTeX) : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#départements-et-archives--résolution-de-contenu).

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
  build.

## Déploiement sur Vercel

1. Pousser le dépôt sur GitHub/GitLab/Bitbucket.
2. Sur [vercel.com/new](https://vercel.com/new), importer le dépôt.
3. Renseigner les variables d'environnement Supabase/Groq (optionnelles,
   assistant IA uniquement) pour les environnements Production et Preview.
4. Déployer. Toutes les pages départements/archives sont générées
   statiquement au build à partir de `content/archives/**` — aucune
   configuration de base de données n'est requise pour ces pages.
5. Vérifier après déploiement : `/sitemap.xml` et `/robots.txt` accessibles,
   navigation Départements → département → année.

## Structure du projet

```
app/
  page.tsx                                  Accueil (hero, stats, départements)
  departements/page.tsx                     Index des 5 départements
  departements/[code]/page.tsx              Détail département + années disponibles
  departements/[code]/[annee]/page.tsx      Épreuve rendue (Markdown), une section par matière
  assistant/page.tsx, api/chat/route.ts     Assistant IA (RAG sur polytech.sn)
  sitemap.ts / robots.ts                    SEO
  opengraph-image.tsx                       Image Open Graph générée dynamiquement

components/
  ui/                               Composants shadcn/ui (générés, éviter de modifier à la main)
  shared/                           Navbar, Footer, cartes département, rendu Markdown
  chat/                             Widget assistant IA

content/
  archives/<groupe-ou-code>/<année>.md      Épreuves (voir "Ajouter une nouvelle épreuve")

lib/
  departements.ts                   Config statique des 5 départements
  content/                          Résolution de contenu, parsing, réparation LaTeX (fonctions pures + tests)
  data/departements.ts              Point d'entrée pour les pages (React cache())
  rag/, supabase/service.ts         Assistant IA
  constants.ts, format.ts, env.ts

supabase/
  schema.sql                        Tables/RLS/RPC de l'assistant IA uniquement
  migrations/                       Historique des migrations appliquées (Supabase CLI)

types/database.ts                   Types Supabase (assistant IA uniquement)

docs/                                Documentation technique (architecture, composants, performance)

.github/                             Workflows CI, templates issues/PR
.husky/                              Git hooks (pre-commit)
```

## Sécurité

- Aucune donnée utilisateur n'est collectée par les pages départements/archives
  (contenu statique, pas de formulaire, pas de compte).
- La clé `service_role` Supabase n'est utilisée que par l'assistant IA, dans
  des modules serveur marqués `server-only` (`lib/supabase/service.ts`),
  jamais exposée au client.
- Vulnérabilité trouvée ? Voir [SECURITY.md](SECURITY.md) pour la procédure de
  signalement responsable.

## Documentation technique

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — vue d'ensemble, résolution
  de contenu Markdown, composants partagés
- [docs/DATABASE.md](docs/DATABASE.md) — schéma Supabase (assistant IA)
- [docs/COMPONENTS.md](docs/COMPONENTS.md) — composants réutilisables et
  quand les utiliser
- [docs/PERFORMANCE.md](docs/PERFORMANCE.md) — rendu statique, cache,
  pagination (assistant IA) : chaque optimisation et sa justification
- [docs/RAG.md](docs/RAG.md) — assistant IA (scraping, retrieval, génération)

## Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour le guide complet (branches,
commits, Pull Requests, revue de code). Ce projet suit un
[Code de conduite](CODE_OF_CONDUCT.md) — merci de le respecter.

Projet sous licence [MIT](LICENSE).
