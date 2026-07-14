# Guide de contribution

Merci de contribuer à **Archives Concours UAM** ! Ce guide explique comment
travailler sur le projet en équipe sans casser l'application.

## Sommaire

- [Cloner le projet](#cloner-le-projet)
- [Convention de nommage des branches](#convention-de-nommage-des-branches)
- [Convention de commits](#convention-de-commits)
- [Ouvrir une Pull Request](#ouvrir-une-pull-request)
- [Règles de revue de code](#règles-de-revue-de-code)
- [Style de code](#style-de-code)

## Cloner le projet

```bash
git clone https://github.com/thiamyatma/archives-concours-uam.git
cd archives-concours-uam
npm install
cp .env.example .env.local
# Renseigner .env.local avec vos identifiants Supabase (voir README.md)
npm run dev
```

Voir le [README.md](README.md) pour la configuration complète de Supabase
(schéma SQL, seed, création d'un compte admin).

## Convention de nommage des branches

Toujours partir de `main` à jour. Nommer la branche selon le type de
changement :

| Préfixe     | Usage                                       | Exemple                          |
| ----------- | ------------------------------------------- | -------------------------------- |
| `feat/`     | Nouvelle fonctionnalité                     | `feat/recherche-plein-texte`     |
| `fix/`      | Correction de bug                           | `fix/upload-pdf-taille-max`      |
| `chore/`    | Config, dépendances, tâches techniques      | `chore/upgrade-next-15`          |
| `docs/`     | Documentation uniquement                    | `docs/update-readme-deploiement` |
| `refactor/` | Refactoring sans changement de comportement | `refactor/lib-data-documents`    |
| `test/`     | Ajout/modification de tests                 | `test/completeness-edge-cases`   |

```bash
git checkout main
git pull
git checkout -b feat/nom-court-descriptif
```

## Convention de commits

Ce projet suit [Conventional Commits](https://www.conventionalcommits.org/fr/).

```
<type>(<scope optionnel>): <description courte à l'impératif>

[corps optionnel : le "pourquoi", pas le "quoi"]
```

**Types autorisés** : `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
`test`, `chore`, `ci`.

Exemples :

```
feat(departements): ajouter la liste des années par département
fix(content): corriger le découpage des sections d'une épreuve
docs(readme): clarifier la procédure d'ajout d'une épreuve
chore(deps): monter next vers 15.5.20
```

- Une ligne de résumé ≤ 72 caractères, à l'impératif ("ajouter", pas
  "ajouté"/"ajoute").
- Un commit = un changement logique. Préférer plusieurs petits commits à un
  gros commit fourre-tout.
- Le hook `pre-commit` (Husky) lance automatiquement ESLint + Prettier sur
  les fichiers modifiés et vérifie le typage TypeScript — un commit qui casse
  le lint ou le typage est bloqué.

## Ouvrir une Pull Request

1. Poussez votre branche : `git push -u origin feat/ma-branche`.
2. Ouvrez la PR sur GitHub — le template se remplit automatiquement
   (résumé, checklist, comment tester).
3. Remplissez la checklist honnêtement (lint/type-check/test/build passés,
   testé manuellement dans le navigateur).
4. La CI (`.github/workflows/ci.yml`) doit passer au vert : lint,
   type-check, tests, build.
5. Liez l'issue concernée avec `Closes #123` si applicable.

## Règles de revue de code

- **Au moins une approbation** avant merge sur `main`.
- L'auteur d'une PR ne merge pas sa propre PR sans review, sauf urgence
  documentée dans la description.
- Les reviewers vérifient :
  - Le changement fait ce que le titre/résumé annonce, sans effet de bord
    non documenté.
  - Pas de secret / clé API commité (`.env.local`, tokens, mots de passe).
  - Les policies RLS et Server Actions ne sont pas affaiblies sans raison
    explicite (voir [SECURITY.md](SECURITY.md)).
  - Les nouvelles fonctions publiques exportées de `lib/` ont un test quand
    c'est pertinent (logique pure : validations, formatage, complétude).
  - Le style suit les conventions existantes (voir ci-dessous).
- Préférez le **squash merge** pour garder un historique `main` lisible.
- En cas de désaccord persistant, un mainteneur tranche.

## Style de code

```bash
npm run lint          # ESLint (règles Next.js + TypeScript)
npm run lint:fix       # Corrige automatiquement ce qui peut l'être
npm run format         # Formate tout le repo avec Prettier
npm run format:check   # Vérifie sans modifier (utilisé en CI si besoin)
npm run type-check     # tsc --noEmit
npm run test           # Vitest
```

Repères architecturaux (détails dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)) :

- **Server Components par défaut** pour la donnée (`lib/data/*`) ; passer en
  Client Component (`"use client"`) seulement pour l'interactivité.
- **Server Actions** (`lib/actions/*`) pour toute mutation (upload, validation
  admin, auth) — jamais d'appel Supabase direct depuis un composant client.
- **Validation Zod** systématique côté serveur pour toute entrée utilisateur,
  même si elle existe déjà côté client (React Hook Form).
- Pas de nouvelle dépendance sans raison claire — vérifier qu'une lib du
  stack existant (shadcn/ui, Radix, React Query...) ne couvre pas déjà le
  besoin.

Merci de contribuer !
