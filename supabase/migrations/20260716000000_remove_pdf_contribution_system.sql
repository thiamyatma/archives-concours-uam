-- =====================================================================
-- Suppression du système PDF/contribution : les archives de concours
-- passent à un modèle de fichiers Markdown committés dans le repo
-- (content/archives/**), plus aucune donnée d'archive en base.
-- =====================================================================

-- 1. Trigger (supprimé aussi implicitement par le drop table ci-dessous,
--    listé explicitement pour la même raison de style que schema.sql).
drop trigger if exists documents_set_updated_at on public.documents;

-- 2. RPC functions
drop function if exists public.increment_document_downloads(uuid);
drop function if exists public.get_global_stats();
drop function if exists public.get_filiere_document_counts();

-- 3. Storage policies (avant la ligne du bucket)
drop policy if exists "documents_bucket_public_upload" on storage.objects;
drop policy if exists "documents_bucket_admin_read" on storage.objects;
drop policy if exists "documents_bucket_admin_delete" on storage.objects;

-- 4. Bucket Storage — nécessite qu'il soit vide (voir vérification manuelle
--    avant application en production).
delete from storage.buckets where id = 'documents';

-- 5. RLS policies des 4 tables (redondant avec le "drop table cascade"
--    ci-dessous, listé explicitement pour la même raison de style).
drop policy if exists "filieres_public_read" on public.filieres;
drop policy if exists "filieres_admin_write" on public.filieres;
drop policy if exists "documents_public_read_approved" on public.documents;
drop policy if exists "documents_public_insert_pending" on public.documents;
drop policy if exists "documents_admin_update" on public.documents;
drop policy if exists "documents_admin_delete" on public.documents;
drop policy if exists "contributors_public_insert" on public.contributors;
drop policy if exists "contributors_admin_read" on public.contributors;
drop policy if exists "reports_public_insert" on public.reports;
drop policy if exists "reports_admin_read" on public.reports;
drop policy if exists "reports_admin_delete" on public.reports;

-- 6. Tables, enfants avant parents. `cascade` en filet de sécurité.
drop table if exists public.reports cascade;
drop table if exists public.documents cascade;
drop table if exists public.contributors cascade;
drop table if exists public.filieres cascade;

-- 7. Enums — après les tables qui les utilisaient comme type de colonne.
drop type if exists public.document_status;
drop type if exists public.document_matiere;
drop type if exists public.document_type;
