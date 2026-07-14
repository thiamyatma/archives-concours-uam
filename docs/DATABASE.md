# Base de données (Supabase)

Source de vérité : [`supabase/schema.sql`](../supabase/schema.sql) (schéma
complet, RLS, storage, RPC) et [`supabase/seed.sql`](../supabase/seed.sql)
(données initiales). Ce document en donne la vue lisible.

## Enums

| Enum               | Valeurs                                                  |
| ------------------ | -------------------------------------------------------- |
| `document_matiere` | `mathematiques`, `physique_chimie`, `anglais`, `logique` |
| `document_type`    | `sujet`, `corrige`                                       |
| `document_status`  | `pending`, `approved`, `rejected`                        |

## Tables

### `filieres`

| Colonne       | Type           | Notes               |
| ------------- | -------------- | ------------------- |
| `id`          | `uuid` (PK)    | `gen_random_uuid()` |
| `code`        | `text`, unique | ex : `dsti`, `dgae` |
| `nom`         | `text`         | ex : `DSTI`         |
| `description` | `text`         |                     |
| `created_at`  | `timestamptz`  |                     |

Seedée avec les 5 filières : DSTI, DGAE, DSTAN, DU2ADT, DGO.

### `documents`

| Colonne                     | Type                     | Notes                                                   |
| --------------------------- | ------------------------ | ------------------------------------------------------- |
| `id`                        | `uuid` (PK)              |                                                         |
| `filiere_id`                | `uuid` (FK filieres)     | `on delete cascade`                                     |
| `annee`                     | `integer`                | `check` 2000–2100                                       |
| `matiere`                   | `document_matiere`       |                                                         |
| `type`                      | `document_type`          | sujet ou corrigé                                        |
| `description`               | `text`                   | optionnelle                                             |
| `file_url`                  | `text`                   | **chemin dans le bucket Storage**, pas une URL publique |
| `file_name`                 | `text`                   | nom original du fichier                                 |
| `file_size`                 | `bigint`                 | en octets                                               |
| `downloads`                 | `integer`                | incrémenté uniquement via la RPC                        |
| `status`                    | `document_status`        | défaut `pending`                                        |
| `uploaded_by`               | `uuid` (FK contributors) | nullable                                                |
| `rejection_reason`          | `text`                   | renseigné par l'admin au refus                          |
| `reviewed_at`               | `timestamptz`            |                                                         |
| `created_at` / `updated_at` | `timestamptz`            | `updated_at` maintenu par trigger                       |

Index : `(filiere_id, annee)`, `status`, `matiere`, recherche plein texte
français sur `description`.

### `contributors`

| Colonne      | Type          | Notes     |
| ------------ | ------------- | --------- |
| `id`         | `uuid` (PK)   |           |
| `nom`        | `text`        | optionnel |
| `email`      | `text`        | optionnel |
| `created_at` | `timestamptz` |           |

Index : `created_at desc` (pagination de la liste admin des contributeurs).

### `reports`

| Colonne          | Type                  | Notes               |
| ---------------- | --------------------- | ------------------- |
| `id`             | `uuid` (PK)           |                     |
| `document_id`    | `uuid` (FK documents) | `on delete cascade` |
| `reason`         | `text`                |                     |
| `reporter_email` | `text`                | optionnel           |
| `created_at`     | `timestamptz`         |                     |

## Fonctions RPC

### `increment_document_downloads(doc_id uuid) returns integer`

`SECURITY DEFINER`. Incrémente `downloads` **uniquement** si le document est
`approved`, sinon lève une exception. Seul point d'entrée autorisé à modifier
ce compteur — appelée depuis `lib/actions/download.ts` après génération d'une
URL signée.

### `get_global_stats() returns table(total_documents, total_downloads, total_contributors)`

`SECURITY DEFINER`, `stable`. Agrège les stats de la page d'accueil en une
seule requête (documents approuvés, somme des téléchargements, contributeurs
distincts ayant au moins un document approuvé).

## Row Level Security (RLS)

RLS activé sur les 4 tables. Résumé :

| Table          | Lecture publique (anon)          | Écriture publique (anon)                        | Admin (authenticated)          |
| -------------- | -------------------------------- | ----------------------------------------------- | ------------------------------ |
| `filieres`     | Toutes les lignes                | Aucune                                          | Lecture + écriture totale      |
| `documents`    | Uniquement `status = 'approved'` | `insert` autorisé, forcé à `status = 'pending'` | Lecture totale + update/delete |
| `contributors` | Aucune (contient des emails)     | `insert` autorisé                               | Lecture totale                 |
| `reports`      | Aucune                           | `insert` autorisé                               | Lecture + delete               |

**Il n'existe pas de table de rôles.** Toute session `authenticated` (via
Supabase Auth) est considérée admin par les policies (`auth.role() =
'authenticated'`). Ne créez des comptes que pour des personnes de confiance.

## Storage

Bucket **`documents`**, privé, limite 20 Mo, `application/pdf` uniquement.

| Policy                           | Rôle                                             |
| -------------------------------- | ------------------------------------------------ |
| `documents_bucket_public_upload` | `anon`/`authenticated` peuvent `insert` (upload) |
| `documents_bucket_admin_read`    | `authenticated` seulement peut `select`          |
| `documents_bucket_admin_delete`  | `authenticated` seulement peut `delete`          |

Le bucket étant privé, **aucun visiteur anonyme ne peut lire un objet
directement** — même l'URL du fichier ne suffit pas. Le téléchargement et
l'aperçu publics passent toujours par une Server Action qui utilise le
client `service_role` (`lib/supabase/service.ts`) pour générer une URL
signée de courte durée (60s pour le téléchargement, 120s pour l'aperçu),
après avoir vérifié que le document est `approved`.

## Complétude d'une session

Un concours "complet" = 4 matières × 2 types = **8 fichiers**. La logique de
calcul (regroupement par année, déduplication matière+type, tri par année
décroissante) vit dans [`lib/completeness.ts`](../lib/completeness.ts),
testée dans `lib/completeness.test.ts`. Elle ne dépend d'aucune requête SQL
spécifique : elle prend en entrée une liste de documents déjà chargée
(`{ annee, matiere, type }[]`).

## Modifier le schéma

1. Éditer `supabase/schema.sql` (idempotent : `create table if not exists`,
   `drop policy if exists` puis `create policy`, etc.).
2. Ajouter une migration horodatée dans `supabase/migrations/` ou repousser
   le schéma complet via `supabase db push` (voir la CLI Supabase).
3. Mettre à jour `types/database.ts` en conséquence (types écrits à la main,
   pas de projet de génération automatique connecté par défaut) — ne pas
   oublier `Relationships` sur chaque table, requis par la version de
   `@supabase/postgrest-js` utilisée par ce projet.
4. Mettre à jour ce document si la structure change.
