# Architecture

## Vue d'ensemble

Archives Concours UAM est une application **Next.js 15 App Router**. Les
pages départements/archives sont du contenu **statique** : le texte des
épreuves est résolu depuis le système de fichiers (`content/archives/**`)
au moment du build et servi tel quel, sans base de données ni état
utilisateur pour le contenu Markdown. Trois fonctionnalités annexes touchent
Supabase : l'assistant IA (voir [`docs/RAG.md`](./RAG.md)), le
téléchargement/la gestion des PDF d'épreuves (voir
[`docs/pdf-downloads.md`](./pdf-downloads.md)) et l'admin — toutes via des
Server Actions/Route Handlers dédiés, jamais depuis les pages statiques
elles-mêmes. Exception scopée : les pages `/departements/[code]` et
`/departements/[code]/[annee]` peuvent, pour une combinaison
département+année encore inconnue au build, faire un aller Supabase pour
découvrir un PDF publié sans Markdown correspondant (voir plus bas) — le
reste du site (accueil, sitemap, etc.) reste inchangé.

```
Navigateur
   │
   ├─ app/departements/**  (Server Components, statiques par défaut)
   │     lib/data/departements.ts ──► lib/content/*.ts ──► content/archives/**
   │     rendu HTML au build pour les combinaisons connues (Markdown)
   │     rendu à la demande (mis en cache ensuite) pour un PDF-seul inconnu
   │     │     lib/data/exam-documents.ts ──► lib/supabase/service.ts ──► Supabase
   │     └─ DownloadPdfButton (Client Component isolé)
   │           lib/actions/download-pdf.ts ──► lib/supabase/service.ts ──► Supabase (PDF)
   │
   ├─ app/assistant + app/api/chat/route.ts
   │     lib/rag/*.ts ──► lib/supabase/service.ts ──► Supabase (RAG)
   │
   └─ app/admin/**  (mot de passe, force-dynamic)
         ├─ /admin              lib/data/download-stats.ts ──► Supabase (stats PDF)
         └─ /admin/epreuves     lib/data/exam-documents.ts,
                                 lib/actions/exam-documents.ts ──► Supabase (documents)
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

`/departements/[code]` utilise `generateStaticParams` + `dynamicParams =
false` : les 5 départements sont figés dans `lib/departements.ts`, un code
inconnu est un 404 dur.

`/departements/[code]/[annee]` utilise `generateStaticParams` (toujours
dérivé uniquement du Markdown, aucun appel réseau au build) mais
**`dynamicParams = true`** : chaque combinaison connue au build reste
pré-rendue en HTML statique (`●` dans la sortie `next build`), mais une
combinaison inconnue n'est plus un 404 systématique — la page tente d'abord
le Markdown, puis un document PDF publié (`getPdfOnlyDocument`, voir
[`docs/pdf-downloads.md`](./pdf-downloads.md)) avant de rendre un vrai 404.
Ce changement permet à une épreuve importée uniquement en PDF depuis
`/admin/epreuves` d'avoir une page publique immédiatement, sans
redéploiement. Next.js met ensuite ce rendu en cache comme une page
statique classique — le coût réseau n'est payé qu'une fois par nouvelle
combinaison, jamais pour les pages Markdown déjà connues au build.

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
pas. C'est la seule route API du projet dédiée à de la logique métier.

Le téléchargement/la gestion des PDF et le dashboard admin n'ont pas non
plus besoin de route API : ce sont des Server Actions
(`lib/actions/download-pdf.ts`, `lib/actions/exam-documents.ts`,
`lib/actions/admin-auth.ts`) appelées directement depuis des Client
Components, et des pages `force-dynamic` (`app/admin/**`) — voir
[`docs/pdf-downloads.md`](./pdf-downloads.md).

## `lib/supabase/`

Un seul client Supabase reste dans le projet :

- **`service.ts`** — clé `service_role`, **jamais** importé côté client
  (protégé par le package `server-only`). Utilisé par l'assistant IA
  (`lib/rag/search.ts`, `lib/rag/rate-limit.ts`) et par le
  téléchargement/la gestion des PDF (`lib/actions/download-pdf.ts`,
  `lib/actions/exam-documents.ts`, `lib/data/download-stats.ts`,
  `lib/data/exam-documents.ts`).

## Composants

Voir [COMPONENTS.md](COMPONENTS.md) pour le détail. En résumé :

- `components/ui/` — généré par shadcn/ui, ne pas éditer à la main (relancer
  `npx shadcn@latest add <composant>` pour mettre à jour)
- `components/shared/` — Navbar, Footer, cartes département, rendu Markdown,
  bouton de téléchargement PDF, lien de consultation, compteur de vues
- `components/chat/` — widget de l'assistant IA
- `components/analytics/` — intégration Google Analytics 4 (voir plus bas)
- `components/admin/` — graphiques du dashboard de statistiques PDF, upload
  de documents (dropzone, progression, sélecteur multi-départements),
  tableau de gestion des épreuves et ses dialogues (modifier, remplacer,
  supprimer)

## Google Analytics 4

Île client isolée, montée une fois dans `app/layout.tsx` via `<Analytics />`
(`components/analytics/analytics.tsx`). N'affecte pas la génération statique
des pages. GA (gtag) n'est chargé **que** si : production **ET**
`NEXT_PUBLIC_GA_MEASUREMENT_ID` présent **ET** consentement accordé — jamais
en dev, jamais avant acceptation de la bannière cookies. L'API d'envoi
d'événements (`lib/analytics/`, `useAnalytics()`) est toujours sûre à
appeler : no-op si GA n'est pas chargé. Détail complet, création de la
propriété GA4 et ajout d'événements : [`docs/google-analytics.md`](./google-analytics.md).

## Téléchargement PDF des épreuves

`components/shared/download-pdf-button.tsx` est un **Client Component**
isolé, monté sur les pages `/departements/[code]/[annee]` par ailleurs
100% statiques. La vérification de disponibilité et la génération de l'URL
signée se font uniquement au montage/clic du bouton, jamais dans le Server
Component de la page — condition pour ne pas réintroduire de dépendance
Supabase sur des pages qui n'en avaient jamais eu besoin. Détail complet :
[`docs/pdf-downloads.md`](./pdf-downloads.md).

## Hooks

Les hooks React personnalisés vont dans `lib/hooks/use-<nom>.ts` :

- `useAnalytics()` — émetteurs d'événements GA4 typés.
- `useDownloadPdf(departementCode, annee)` — cycle de vie du téléchargement
  PDF (vérification, état, déclenchement, toast, événement GA4).
- `useFileUpload()` — upload direct navigateur → Supabase Storage avec
  progression réelle (`XMLHttpRequest`, voir
  [`docs/pdf-downloads.md`](./pdf-downloads.md)), utilisé par la page
  `/admin/epreuves`.
