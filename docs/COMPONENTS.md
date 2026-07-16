# Composants

Trois familles : `components/ui/` (shadcn, généré), `components/shared/`
(public), `components/admin/` (dashboard de statistiques + gestion des
épreuves, protégé par mot de passe — voir [pdf-downloads.md](pdf-downloads.md)).
Voir [ARCHITECTURE.md](ARCHITECTURE.md) pour la philosophie générale (Server
vs Client Components).

## `components/ui/`

Généré par shadcn/ui (`npx shadcn@latest add <nom>`). **Ne pas éditer à la
main** — si un ajustement de style est nécessaire, préférez surcharger via
`className` depuis l'appelant, ou relancez la commande `add` pour
régénérer. Le projet utilise la base **Radix** (pas Base UI) : les
composants composables (`Button`, `DialogTrigger`, etc.) supportent la prop
`asChild`.

## `components/shared/`

| Composant              | Type   | Rôle                                                                                    |
| ---------------------- | ------ | --------------------------------------------------------------------------------------- |
| `Navbar`               | client | Logo (mark recadré), nav principale, menu mobile (Sheet)                                |
| `Footer`               | server | Logo complet, liens départements/navigation, mention non-affiliation                    |
| `DepartementCard`      | server | Carte département (nom, description, nb de sessions, lien archives)                     |
| `DepartementYearsList` | client | Liste des années Markdown (props) fusionnée avec les années PDF-seul (fetch au montage) |
| `MarkdownRenderer`     | server | Rend une chaîne Markdown (react-markdown + remark-gfm/math + KaTeX)                     |
| `StatsSection`         | server | Tuiles de statistiques génériques (page d'accueil)                                      |
| `DownloadPdfButton`    | client | Bouton de téléchargement PDF (vérification + URL signée + toast)                        |
| `PdfInlineViewer`      | client | Visionneuse PDF intégrée (`iframe`) pour la page de repli PDF-seul                      |
| `RecordDocumentView`   | client | Compte une consultation de page (sans rendu), indépendant de GA4                        |

## `components/admin/`

Protégé par `app/admin/(protected)/layout.tsx` (mot de passe). Deux pages :
`/admin` (statistiques) et `/admin/epreuves` (gestion des PDF).

| Composant                | Type   | Rôle                                                         |
| ------------------------ | ------ | ------------------------------------------------------------ |
| `AdminNav`               | client | Onglets entre les deux pages admin                           |
| `DownloadBarChart`       | server | Graphique en barres sans dépendance externe (statistiques)   |
| `UploadDropzone`         | client | Drag & drop + sélection de fichiers PDF                      |
| `PendingUploadCard`      | client | Un fichier en attente + son mini-formulaire de métadonnées   |
| `DepartementMultiSelect` | client | Sélection multiple de départements pour un document          |
| `UploadProgress`         | client | Barre de progression réelle (`XMLHttpRequest`)               |
| `DocumentsTable`         | client | Tableau des documents + menu d'actions par ligne             |
| `EditMetadataDialog`     | client | Modifier départements/année/description/statut d'un document |
| `ReplacePdfDialog`       | client | Remplacer le fichier d'un document existant                  |
| `DeleteDialog`           | client | Confirmation de suppression (`alert-dialog`)                 |

## `components/chat/`

Widget de l'assistant IA (voir [RAG.md](RAG.md)), monté globalement dans
`app/layout.tsx`. `ChatPanel` (logique de chat, parsing SSE) est chargé via
`next/dynamic({ ssr: false })` : son JS n'est récupéré que si quelqu'un
clique réellement sur la bulle.

## `components/analytics/`

Intégration Google Analytics 4, montée globalement dans `app/layout.tsx`
via `<Analytics />` (île client). GA n'est chargé qu'en production, après
consentement (bannière cookies). Voir [google-analytics.md](google-analytics.md)
pour l'architecture complète et l'ajout d'événements.

## `MarkdownRenderer`

`components/shared/markdown-renderer.tsx` est un **Server Component** :
`react-markdown`/`remark`/`rehype`/`katex` n'ont besoin d'aucune API
navigateur, donc afficher une épreuve n'ajoute aucun JavaScript au bundle
client. Styles via le plugin `@tailwindcss/typography` (classe `prose`),
ses couleurs reliées aux tokens du thème existant dans `app/globals.css`
plutôt que ses gris par défaut.

## Ajouter un nouveau composant

1. `components/ui/` : nouveau composant shadcn → `npx shadcn@latest add <nom>`.
2. Composant public réutilisable sur plusieurs pages → `components/shared/`.
3. Server Component par défaut ; n'ajoutez `"use client"` que si vous avez
   besoin d'un hook React (`useState`, `useEffect`...), d'un gestionnaire
   d'événement, ou d'une API navigateur.
