-- =====================================================================
-- Archives Concours UAM — Schéma Supabase (PostgreSQL)
-- =====================================================================
-- À exécuter dans l'éditeur SQL du projet Supabase (ou via `supabase db push`).
-- Idempotent : peut être relancé sans erreur.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------

do $$ begin
  create type document_matiere as enum (
    'mathematiques',
    'physique_chimie',
    'anglais',
    'logique'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_type as enum ('sujet', 'corrige');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Table: filieres
-- ---------------------------------------------------------------------

create table if not exists public.filieres (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  nom text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.filieres is 'Filières du concours UAM (DSTI, DGAE, DSTAN, DU2ADT, DGO).';

-- ---------------------------------------------------------------------
-- Table: contributors
-- ---------------------------------------------------------------------

create table if not exists public.contributors (
  id uuid primary key default gen_random_uuid(),
  nom text,
  email text,
  created_at timestamptz not null default now()
);

comment on table public.contributors is 'Contributeurs ayant partagé au moins une épreuve.';

-- ---------------------------------------------------------------------
-- Table: documents
-- ---------------------------------------------------------------------

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  filiere_id uuid not null references public.filieres (id) on delete cascade,
  annee integer not null check (annee between 2000 and 2100),
  matiere document_matiere not null,
  type document_type not null,
  description text not null default '',
  file_url text not null,
  file_name text not null,
  file_size bigint not null default 0,
  downloads integer not null default 0,
  status document_status not null default 'pending',
  uploaded_by uuid references public.contributors (id) on delete set null,
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.documents is 'Épreuves (sujets/corrigés) déposées par la communauté ou l''admin.';

create index if not exists documents_filiere_annee_idx on public.documents (filiere_id, annee);
create index if not exists documents_status_idx on public.documents (status);
create index if not exists documents_matiere_idx on public.documents (matiere);
create index if not exists documents_search_idx on public.documents
  using gin (to_tsvector('french', coalesce(description, '')));

-- ---------------------------------------------------------------------
-- Table: reports (signalement d'un document)
-- ---------------------------------------------------------------------

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  reason text not null,
  reporter_email text,
  created_at timestamptz not null default now()
);

comment on table public.reports is 'Signalements communautaires sur un document publié.';

-- ---------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RPC: incrémentation atomique des téléchargements
-- SECURITY DEFINER : seule cette fonction peut faire évoluer `downloads`,
-- et uniquement pour un document déjà approuvé.
-- ---------------------------------------------------------------------

create or replace function public.increment_document_downloads(doc_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  update public.documents
  set downloads = downloads + 1
  where id = doc_id and status = 'approved'
  returning downloads into new_count;

  if new_count is null then
    raise exception 'Document introuvable ou non approuvé';
  end if;

  return new_count;
end;
$$;

revoke all on function public.increment_document_downloads(uuid) from public;
grant execute on function public.increment_document_downloads(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- RPC: statistiques globales pour la page d'accueil
-- ---------------------------------------------------------------------

create or replace function public.get_global_stats()
returns table (
  total_documents bigint,
  total_downloads bigint,
  total_contributors bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.documents where status = 'approved'),
    (select coalesce(sum(downloads), 0) from public.documents where status = 'approved'),
    (select count(distinct uploaded_by) from public.documents
       where status = 'approved' and uploaded_by is not null);
$$;

grant execute on function public.get_global_stats() to anon, authenticated;

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.filieres enable row level security;
alter table public.documents enable row level security;
alter table public.contributors enable row level security;
alter table public.reports enable row level security;

-- filieres : lecture publique, écriture admin uniquement
drop policy if exists "filieres_public_read" on public.filieres;
create policy "filieres_public_read"
  on public.filieres for select
  using (true);

drop policy if exists "filieres_admin_write" on public.filieres;
create policy "filieres_admin_write"
  on public.filieres for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- documents : lecture publique des docs approuvés, lecture totale pour admin
drop policy if exists "documents_public_read_approved" on public.documents;
create policy "documents_public_read_approved"
  on public.documents for select
  using (status = 'approved' or auth.role() = 'authenticated');

-- documents : dépôt public (contribution) forcé en status = pending
drop policy if exists "documents_public_insert_pending" on public.documents;
create policy "documents_public_insert_pending"
  on public.documents for insert
  to anon, authenticated
  with check (status = 'pending');

-- documents : seule l'admin peut modifier (validation/refus) ou supprimer
drop policy if exists "documents_admin_update" on public.documents;
create policy "documents_admin_update"
  on public.documents for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "documents_admin_delete" on public.documents;
create policy "documents_admin_delete"
  on public.documents for delete
  using (auth.role() = 'authenticated');

-- contributors : dépôt public, lecture réservée à l'admin (contient des emails)
drop policy if exists "contributors_public_insert" on public.contributors;
create policy "contributors_public_insert"
  on public.contributors for insert
  to anon, authenticated
  with check (true);

drop policy if exists "contributors_admin_read" on public.contributors;
create policy "contributors_admin_read"
  on public.contributors for select
  using (auth.role() = 'authenticated');

-- reports : signalement public, lecture/suppression réservées à l'admin
drop policy if exists "reports_public_insert" on public.reports;
create policy "reports_public_insert"
  on public.reports for insert
  to anon, authenticated
  with check (true);

drop policy if exists "reports_admin_read" on public.reports;
create policy "reports_admin_read"
  on public.reports for select
  using (auth.role() = 'authenticated');

drop policy if exists "reports_admin_delete" on public.reports;
create policy "reports_admin_delete"
  on public.reports for delete
  using (auth.role() = 'authenticated');

-- =====================================================================
-- Storage : bucket privé pour les PDF
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 20971520, array['application/pdf'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Dépôt public autorisé (contribution), lecture/suppression réservées à l'admin.
-- Les téléchargements publics passent par une URL signée générée côté serveur
-- (voir lib/supabase/download.ts), jamais par un accès direct au bucket.

drop policy if exists "documents_bucket_public_upload" on storage.objects;
create policy "documents_bucket_public_upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'documents');

drop policy if exists "documents_bucket_admin_read" on storage.objects;
create policy "documents_bucket_admin_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents');

drop policy if exists "documents_bucket_admin_delete" on storage.objects;
create policy "documents_bucket_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents');
