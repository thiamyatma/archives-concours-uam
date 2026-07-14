# Composants

Deux familles : `components/ui/` (shadcn, généré), `components/shared/`
(public). Voir [ARCHITECTURE.md](ARCHITECTURE.md) pour la philosophie
générale (Server vs Client Components). Il n'y a plus de dossier
`components/admin/` : le tableau de bord de modération PDF a disparu avec
le passage aux archives Markdown.

## `components/ui/`

Généré par shadcn/ui (`npx shadcn@latest add <nom>`). **Ne pas éditer à la
main** — si un ajustement de style est nécessaire, préférez surcharger via
`className` depuis l'appelant, ou relancez la commande `add` pour
régénérer. Le projet utilise la base **Radix** (pas Base UI) : les
composants composables (`Button`, `DialogTrigger`, etc.) supportent la prop
`asChild`.

## `components/shared/`

| Composant              | Type   | Rôle                                                                 |
| ---------------------- | ------ | -------------------------------------------------------------------- |
| `Navbar`               | client | Logo (mark recadré), nav principale, menu mobile (Sheet)             |
| `Footer`               | server | Logo complet, liens départements/navigation, mention non-affiliation |
| `DepartementCard`      | server | Carte département (nom, description, nb de sessions, lien archives)  |
| `DepartementYearsList` | server | Liste des années disponibles pour un département (pas de pagination) |
| `MarkdownRenderer`     | server | Rend une chaîne Markdown (react-markdown + remark-gfm/math + KaTeX)  |
| `StatsSection`         | server | Tuiles de statistiques génériques (page d'accueil)                   |

## `components/chat/`

Widget de l'assistant IA (voir [RAG.md](RAG.md)), monté globalement dans
`app/layout.tsx`. `ChatPanel` (logique de chat, parsing SSE) est chargé via
`next/dynamic({ ssr: false })` : son JS n'est récupéré que si quelqu'un
clique réellement sur la bulle.

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
