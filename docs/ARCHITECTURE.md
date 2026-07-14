# Architecture

## Vue d'ensemble

Archives Concours UAM est une application **Next.js 15 App Router**. Les
pages départements/archives sont du contenu **statique** : aucune base de
données, aucune Server Action, aucun état utilisateur — le contenu est
résolu depuis le système de fichiers (`content/archives/**`) au moment du
build et servi tel quel. Seul l'assistant IA (voir
[`docs/RAG.md`](./RAG.md)) parle à une vraie base de données.

```
Navigateur
   │
   ├─ app/departements/**  (Server Components, 100% statiques)
   │     lib/data/departements.ts ──► lib/content/*.ts ──► content/archives/**
   │     rendu HTML au build, aucun appel réseau à l'exécution
   │
   └─ app/assistant + app/api/chat/route.ts
         lib/rag/*.ts ──► lib/supabase/service.ts ──► Supabase (RAG uniquement)
```

## Départements et archives : résolution de contenu

Voir `lib/departements.ts` pour la config statique des 5 départements
(`code`, `nom`, `description`, `contentGroup`) et
[README.md#ajouter-une-nouvelle-épreuve](../README.md#ajouter-une-nouvelle-épreuve)
pour la procédure d'ajout d'une session.

- **`lib/content/fs.ts`** (server-only) — lecture disque brute
  (`fs.readdirSync`/`fs.readFileSync`) sous `content/archives/`.
- **`lib/content/resolve.ts`** (pur, testé) — logique de résolution :
  quel dossier lire en premier (propre au département) puis en repli
  (groupe partagé), fusion/tri des années disponibles.
- **`lib/content/repair-latex.ts`** (pur, testé) — répare une corruption
  d'encodage connue (des commandes LaTeX comme `\times`/`\frac`/`\vec`
  ont été réduites à un caractère de contrôle), uniquement à l'intérieur
  des spans `$...$`/`$$...$$`.
- **`lib/content/normalize-qcm.ts`** (pur, testé) — force un retour à la
  ligne Markdown sur les options `A./B./C./D.` d'un QCM, qui ne sont pas
  des marqueurs de liste CommonMark valides.
- **`lib/content/parse.ts`** (pur, testé) — découpe un fichier en titre
  (premier `# `), en-tête (avant la première `## ÉPREUVE ...`) et une
  section par matière (une par heading `## ÉPREUVE ...` rencontré).
- **`lib/content/manifest.ts`** — agrégat (nombre de départements, de
  sessions, année la plus récente) utilisé par la page d'accueil et le
  sitemap.
- **`lib/data/departements.ts`** — point d'entrée unique pour les pages,
  toutes les fonctions wrappées en React `cache()` (dédup intra-requête).

Toutes les routes `/departements/**` utilisent `generateStaticParams` +
`dynamicParams = false` : chaque combinaison (département, année) connue
au build est pré-rendue en HTML statique (`○` dans la sortie `next
build`) — aucune fonction serverless ne touche le système de fichiers à
l'exécution.

## Rendu Markdown

`components/shared/markdown-renderer.tsx` (Server Component) utilise
`react-markdown` + `remark-gfm` (tableaux, listes) + `remark-math`/
`rehype-katex` (formules scientifiques). N'ayant besoin d'aucune API
navigateur, ce composant n'ajoute aucun JavaScript au bundle client.

## Pourquoi pas de routes API classiques ?

Le projet n'a **pas de `app/api/*/route.ts`** pour les départements/
archives — un Server Component qui lit le système de fichiers au build
n'a besoin d'aucun endpoint. Les seules routes générées par convention de
fichiers Next.js sont :

| Route              | Fichier                   | Rôle                                 |
| ------------------ | ------------------------- | ------------------------------------ |
| `/sitemap.xml`     | `app/sitemap.ts`          | Sitemap (départements + années)      |
| `/robots.txt`      | `app/robots.ts`           | Règles robots + lien vers le sitemap |
| `/opengraph-image` | `app/opengraph-image.tsx` | Image Open Graph générée à la volée  |
| `/twitter-image`   | `app/twitter-image.tsx`   | Réutilise `opengraph-image.tsx`      |
| `/icon.png`        | `app/icon.png`            | Favicon (mark du logo UAM)           |

**Exception : `app/api/chat/route.ts`**. L'assistant IA (voir
[`docs/RAG.md`](./RAG.md)) streame sa réponse token par token (SSE) pendant
qu'elle est générée par Groq — un format qu'un Server Component ne permet
pas. C'est la seule route API du projet dédiée à de la logique métier, et
le seul point du site qui parle à Supabase.

## `lib/supabase/`

Un seul client Supabase reste dans le projet, réservé à l'assistant IA :

- **`service.ts`** — clé `service_role`, **jamais** importé côté client
  (protégé par le package `server-only`), utilisé par `lib/rag/search.ts`
  et `lib/rag/rate-limit.ts`.

## Composants

Voir [COMPONENTS.md](COMPONENTS.md) pour le détail. En résumé :

- `components/ui/` — généré par shadcn/ui, ne pas éditer à la main (relancer
  `npx shadcn@latest add <composant>` pour mettre à jour)
- `components/shared/` — Navbar, Footer, cartes département, rendu Markdown
- `components/chat/` — widget de l'assistant IA
- `components/analytics/` — intégration Google Analytics 4 (voir plus bas)

## Google Analytics 4

Île client isolée, montée une fois dans `app/layout.tsx` via `<Analytics />`
(`components/analytics/analytics.tsx`). N'affecte pas la génération statique
des pages. GA (gtag) n'est chargé **que** si : production **ET**
`NEXT_PUBLIC_GA_MEASUREMENT_ID` présent **ET** consentement accordé — jamais
en dev, jamais avant acceptation de la bannière cookies. L'API d'envoi
d'événements (`lib/analytics/`, `useAnalytics()`) est toujours sûre à
appeler : no-op si GA n'est pas chargé. Détail complet, création de la
propriété GA4 et ajout d'événements : [`docs/google-analytics.md`](./google-analytics.md).

## Hooks

Les hooks React personnalisés vont dans `lib/hooks/use-<nom>.ts`. Le seul à
ce jour est `useAnalytics()` (`lib/hooks/use-analytics.ts`), qui expose des
émetteurs d'événements GA4 typés utilisables depuis n'importe quel Client
Component.
