# Base de données

Le contenu textuel des archives (départements/années/épreuves) ne vit pas
en base de données — ce sont des fichiers Markdown git-versionnés sous
`content/archives/**` (voir [ARCHITECTURE.md](ARCHITECTURE.md#départements-et-archives--résolution-de-contenu)).
Les PDF téléchargeables, eux, sont gérés depuis la page admin
`/admin/epreuves` et vivent ici (métadonnées) + Supabase Storage (octets) —
voir [pdf-downloads.md](pdf-downloads.md). Les données persistées ici
servent aussi l'assistant IA (RAG sur polytech.sn, voir [RAG.md](RAG.md)),
le rate-limiting et la session admin.

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

## `exam_documents`

| Colonne                     | Type          | Notes                                     |
| --------------------------- | ------------- | ----------------------------------------- |
| `id`                        | `uuid` (PK)   |                                           |
| `annee`                     | `integer`     | 2000-2100                                 |
| `file_name`                 | `text`        | nom original (affichage + téléchargement) |
| `storage_path`              | `text`        | ex. `dgae-dsti-dstaan/2025/nom.pdf`       |
| `file_size`                 | `bigint`      | octets                                    |
| `description`               | `text`        | optionnelle                               |
| `statut`                    | `text`        | `publie` / `brouillon`                    |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` maintenu par trigger         |

## `exam_document_departments`

Table de liaison — un document peut couvrir plusieurs départements.

| Colonne            | Type      | Notes                                |
| ------------------ | --------- | ------------------------------------ |
| `document_id`      | `uuid`    | FK `exam_documents`, cascade         |
| `departement_code` | `text`    | ex. `dsti`                           |
| `annee`            | `integer` | dénormalisée depuis `exam_documents` |

Clé primaire `(document_id, departement_code)`. **`unique (departement_code,
annee)`** : un département donné ne peut être lié qu'à un seul document par
année (le doublon est rejeté à l'import) — voir [pdf-downloads.md](pdf-downloads.md).

## `exam_document_views`

| Colonne            | Type          | Notes |
| ------------------ | ------------- | ----- |
| `id`               | `uuid` (PK)   |       |
| `departement_code` | `text`        |       |
| `annee`            | `integer`     |       |
| `viewed_at`        | `timestamptz` |       |

Log insert-only, une consultation de page épreuve (compteur admin,
indépendant de Google Analytics), rate-limitée par IP+département+année.

## `qcm_attempts`

| Colonne        | Type          | Notes                                  |
| -------------- | ------------- | -------------------------------------- |
| `id`           | `uuid` (PK)   |                                        |
| `groupe`       | `text`        | `contentGroup`, ex. `dsti-dgae-dstaan` |
| `annee`        | `integer`     |                                        |
| `matiere`      | `text`        | slug, ex. `mathematiques`              |
| `completed_at` | `timestamptz` |                                        |

Log insert-only, une correction QCM générée (clic sur « Voir ma correction »,
voir [qcm-entrainement.md](qcm-entrainement.md)), rate-limitée par
IP+groupe+année+matière. Ne contient jamais les réponses du candidat ni son
score — uniquement de quoi compter les utilisations pour le dashboard admin.

## `action_rate_limits`

| Colonne      | Type          | Notes                                              |
| ------------ | ------------- | -------------------------------------------------- |
| `id`         | `uuid` (PK)   |                                                    |
| `key_hash`   | `text`        | SHA-256 d'une clé (IP, ou IP+contexte)             |
| `action`     | `text`        | ex. `admin_login`, `pdf_download`, `document_view` |
| `created_at` | `timestamptz` |                                                    |

Limiteur générique par clé+action, voir `check_action_rate_limit` ci-dessous.

## `admin_session_state`

| Colonne      | Type                      | Notes                                 |
| ------------ | ------------------------- | ------------------------------------- |
| `id`         | `boolean` (PK, singleton) | toujours `true`                       |
| `revoked_at` | `timestamptz`             | horodatage de la dernière déconnexion |

Une seule ligne : se déconnecter (`logoutAdmin`) met à jour `revoked_at`,
invalidant tous les cookies de session émis avant cet instant.

## `admin_users`

| Colonne         | Type          | Notes                               |
| --------------- | ------------- | ----------------------------------- |
| `id`            | `uuid` (PK)   |                                     |
| `email`         | `text`        | unique, identifiant de connexion    |
| `password_hash` | `text`        | scrypt `sel:hash` — jamais en clair |
| `created_at`    | `timestamptz` |                                     |

Comptes admin (email + mot de passe), remplacent le mot de passe unique — voir
[contest-settings.md](contest-settings.md) et `lib/auth/password.ts`.

## `contest_settings`

Ligne **singleton** (`id = true`) pilotant toutes les infos du concours
affichées sur le site. Scalaires typés + `jsonb` pour les groupes.

| Colonne                                                              | Type           | Notes                                   |
| -------------------------------------------------------------------- | -------------- | --------------------------------------- |
| `id`                                                                 | `boolean` (PK) | toujours `true`                         |
| `year`, `official_name`, `subtitle`, `description`                   | scalaires      | infos générales                         |
| `registration_opens_at`/`_closes_at`, `contest_date`, `results_date` | `timestamptz`  | nullables — pilotent la machine à états |
| `messages`, `banner`, `countdown`, `buttons`, `info`                 | `jsonb`        | groupes éditables                       |
| `seo`, `stats`                                                       | `jsonb`        | SEO page d'accueil, toggles de stats    |
| `updated_at`                                                         | `timestamptz`  | trigger                                 |

Édité depuis `/admin/parametres`, lu (caché) par `lib/contest/settings.ts` —
voir [contest-settings.md](contest-settings.md).

## `contest_settings_history`

| Colonne       | Type          | Notes                                       |
| ------------- | ------------- | ------------------------------------------- |
| `id`          | `uuid` (PK)   |                                             |
| `changed_at`  | `timestamptz` |                                             |
| `admin_email` | `text`        | dénormalisé (pas de FK vers `admin_users`)  |
| `field_path`  | `text`        | dot-path, ex. `messages.duringRegistration` |
| `old_value`   | `text`        | nullable                                    |
| `new_value`   | `text`        | nullable                                    |

Une ligne par champ modifié à chaque enregistrement depuis
`/admin/parametres` (`lib/contest/history.ts`).

## RPC

- `search_polytech_chunks(search_query, match_count)` — retrieval du RAG :
  recherche full-text (`french_unaccent`, essai strict via
  `websearch_to_tsquery` puis repli en OR sur les lexèmes) sur
  `polytech_chunks`, classé par `ts_rank`.
- `get_pdf_download_stats()`, `get_pdf_downloads_by_departement()`,
  `get_pdf_downloads_by_annee()`, `get_top_downloaded_pdfs(limit_count)` —
  agrégats pour `/admin`, calculés en base (`group by` + `count(*)`) plutôt
  que rapatriés ligne par ligne côté application.
- `get_exam_documents_with_stats()` — un document par ligne pour
  `/admin/epreuves`, avec `departement_codes` agrégé (`array_agg`) et
  `downloads`/`views` sommés à travers tous les départements liés.
- `check_and_record_rag_rate_limit(p_ip_hash, p_limit)` — check-then-insert
  atomique (verrou advisory) pour le rate-limit du RAG.
- `check_action_rate_limit(p_key_hash, p_action, p_limit, p_window_seconds)`
  — limiteur générique par clé+action, même principe, utilisé pour
  `admin_login`, `pdf_download` et `document_view`.

## RLS

- `polytech_pages`/`polytech_chunks` : lecture publique (contenu déjà public
  sur polytech.sn), aucune policy d'écriture — seul le service role (script
  de scraping, `lib/rag/*.ts`) peut modifier ces tables.
- `rag_query_log` : aucune policy publique, lu/écrit uniquement par
  `app/api/chat/route.ts` via le service role.
- `pdf_downloads`, `exam_documents`, `exam_document_departments`,
  `exam_document_views`, `action_rate_limits`, `admin_session_state` :
  aucune policy publique (ni lecture ni écriture) sur aucune de ces tables —
  lu/écrit uniquement par le service role.

Schéma complet : [`supabase/schema.sql`](../supabase/schema.sql).
