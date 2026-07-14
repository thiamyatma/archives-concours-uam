# Base de données

Les archives de concours (départements/années/épreuves) ne vivent **pas**
en base de données — ce sont des fichiers Markdown git-versionnés sous
`content/archives/**` (voir [ARCHITECTURE.md](ARCHITECTURE.md#départements-et-archives--résolution-de-contenu)).
Les PDF correspondants vivent dans Supabase Storage, pas en base non plus
(voir [pdf-downloads.md](pdf-downloads.md)). Les données persistées ici
servent l'assistant IA (RAG sur polytech.sn, voir [RAG.md](RAG.md)) et le
log des téléchargements PDF.

## `polytech_pages`

| Colonne                     | Type          | Notes                                    |
| --------------------------- | ------------- | ---------------------------------------- |
| `id`                        | `uuid` (PK)   |                                          |
| `url`                       | `text`        | unique                                   |
| `title`                     | `text`        |                                          |
| `section`                   | `text`        | dérivée du chemin de l'URL               |
| `content_hash`              | `text`        | détection de changement entre re-scrapes |
| `fetched_at`                | `timestamptz` |                                          |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` maintenu par trigger        |

## `polytech_chunks`

| Colonne       | Type                                  | Notes                                         |
| ------------- | ------------------------------------- | --------------------------------------------- |
| `id`          | `uuid` (PK)                           |                                               |
| `page_id`     | `uuid` (FK `polytech_pages`, cascade) |                                               |
| `chunk_index` | `integer`                             | unique avec `page_id`                         |
| `content`     | `text`                                | passage de ~800-1200 caractères               |
| `tsv`         | `tsvector` (généré, indexé GIN)       | full-text français (config `french_unaccent`) |

## `rag_query_log`

| Colonne      | Type          | Notes                                   |
| ------------ | ------------- | --------------------------------------- |
| `id`         | `uuid` (PK)   |                                         |
| `ip_hash`    | `text`        | SHA-256 de l'IP, pas l'IP en clair      |
| `created_at` | `timestamptz` | rate-limiting uniquement, aucun contenu |

## `pdf_downloads`

| Colonne            | Type          | Notes                         |
| ------------------ | ------------- | ----------------------------- |
| `id`               | `uuid` (PK)   |                               |
| `departement_code` | `text`        | ex. `dsti`                    |
| `annee`            | `integer`     | 2000-2100                     |
| `file_name`        | `text`        | nom proposé au téléchargement |
| `downloaded_at`    | `timestamptz` |                               |

Log insert-only, un événement par téléchargement réussi — voir
[pdf-downloads.md](pdf-downloads.md).

## RPC

- `search_polytech_chunks(search_query, match_count)` — retrieval du RAG :
  recherche full-text (`french_unaccent`, essai strict via
  `websearch_to_tsquery` puis repli en OR sur les lexèmes) sur
  `polytech_chunks`, classé par `ts_rank`.
- `get_pdf_download_stats()`, `get_pdf_downloads_by_departement()`,
  `get_pdf_downloads_by_annee()`, `get_top_downloaded_pdfs(limit_count)` —
  agrégats pour le dashboard admin, calculés en base (`group by` +
  `count(*)`) plutôt que rapatriés ligne par ligne côté application.

## RLS

- `polytech_pages`/`polytech_chunks` : lecture publique (contenu déjà public
  sur polytech.sn), aucune policy d'écriture — seul le service role (script
  de scraping, `lib/rag/*.ts`) peut modifier ces tables.
- `rag_query_log` : aucune policy publique, lu/écrit uniquement par
  `app/api/chat/route.ts` via le service role.
- `pdf_downloads` : aucune policy publique (ni lecture ni écriture) — lu/écrit
  uniquement par le service role, depuis `lib/actions/download-pdf.ts` et
  `lib/data/download-stats.ts`.

Schéma complet : [`supabase/schema.sql`](../supabase/schema.sql).
