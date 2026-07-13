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

-- =====================================================================
-- Assistant IA (RAG sur polytech.sn) — voir migrations/20260713000000_polytech_rag.sql
-- =====================================================================
--
-- Idempotent : peut être relancé sans erreur.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- ---------------------------------------------------------------------
-- Config de recherche texte français insensible aux accents.
-- Le config 'french' natif de Postgres stemme différemment un mot accentué
-- et sa version sans accent (ex: "filières" -> 'fili' mais "filieres" ->
-- 'filier'), donc une question tapée sans accents ne retrouve rien. On
-- chaîne 'unaccent' avant le stemmer français pour corriger ça.
-- ---------------------------------------------------------------------

do $$ begin
  create text search configuration public.french_unaccent (copy = pg_catalog.french);
-- CREATE TEXT SEARCH CONFIGURATION lève unique_violation (pas duplicate_object)
-- quand la config existe déjà, car elle passe par l'index unique du catalogue.
exception when duplicate_object or unique_violation then null; end $$;

alter text search configuration public.french_unaccent
  alter mapping for hword, hword_part, word
  with unaccent, french_stem;

-- ---------------------------------------------------------------------
-- Table: polytech_pages
-- ---------------------------------------------------------------------

create table if not exists public.polytech_pages (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  title text not null default '',
  -- Section dérivée du chemin de l'URL (ex: "admission", "presentation"),
  -- affichée dans les sources citées par l'assistant.
  section text not null default '',
  content_hash text not null,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.polytech_pages is
  'Pages du site polytech.sn indexées pour l''assistant IA (RAG). Re-scrapées périodiquement via cron.';

-- ---------------------------------------------------------------------
-- Table: polytech_chunks
-- ---------------------------------------------------------------------

create table if not exists public.polytech_chunks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.polytech_pages (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  tsv tsvector generated always as (to_tsvector('french_unaccent', content)) stored,
  created_at timestamptz not null default now(),
  unique (page_id, chunk_index)
);

comment on table public.polytech_chunks is
  'Passages (~800-1200 caractères) issus du découpage des pages polytech.sn, indexés en full-text français.';

create index if not exists polytech_chunks_tsv_idx on public.polytech_chunks using gin (tsv);
create index if not exists polytech_chunks_page_id_idx on public.polytech_chunks (page_id);

-- ---------------------------------------------------------------------
-- Table: rag_query_log (rate-limiting minimal par IP, pas de contenu stocké)
-- ---------------------------------------------------------------------

create table if not exists public.rag_query_log (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  created_at timestamptz not null default now()
);

comment on table public.rag_query_log is
  'Horodatage des requêtes à l''assistant IA par IP hashée (SHA-256), utilisé uniquement pour limiter les abus.';

create index if not exists rag_query_log_ip_hash_created_at_idx
  on public.rag_query_log (ip_hash, created_at desc);

-- ---------------------------------------------------------------------
-- updated_at trigger (réutilise la fonction déjà définie dans schema.sql)
-- ---------------------------------------------------------------------

drop trigger if exists polytech_pages_set_updated_at on public.polytech_pages;
create trigger polytech_pages_set_updated_at
  before update on public.polytech_pages
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RPC: recherche full-text des passages pertinents (retrieval du RAG)
-- SECURITY INVOKER (par défaut) : s'appuie sur les policies RLS ci-dessous.
-- ---------------------------------------------------------------------

create or replace function public.search_polytech_chunks(
  search_query text,
  match_count integer default 6
)
returns table (
  chunk_id uuid,
  page_url text,
  page_title text,
  section text,
  content text,
  rank real
)
language plpgsql
stable
as $$
declare
  lexemes text[];
  strict_query tsquery;
  query tsquery;
begin
  if search_query is null or length(trim(search_query)) = 0 then
    return;
  end if;

  select array_agg(lex.word)
  into lexemes
  from unnest(tsvector_to_array(to_tsvector('french_unaccent', search_query))) as lex(word);

  if lexemes is null or array_length(lexemes, 1) = 0 then
    return;
  end if;

  -- Essai strict d'abord (tous les mots présents, via websearch_to_tsquery)
  -- pour la meilleure précision quand un passage correspond vraiment bien.
  strict_query := websearch_to_tsquery('french_unaccent', search_query);

  if exists (select 1 from public.polytech_chunks c where c.tsv @@ strict_query) then
    query := strict_query;
  else
    -- Repli en OR : une question naturelle ("Quelles filières propose
    -- Polytech ?") ne contient presque jamais tous ses mots dans un même
    -- passage, donc le mode strict ne renverrait rien. On combine les
    -- lexèmes en OR à la place, ts_rank classant en tête les passages qui
    -- matchent le plus de termes (moins précis, mais mieux que rien).
    query := to_tsquery('french_unaccent', array_to_string(lexemes, ' | '));
  end if;

  return query
  select
    c.id,
    p.url,
    p.title,
    p.section,
    c.content,
    ts_rank(c.tsv, query)
  from public.polytech_chunks c
  join public.polytech_pages p on p.id = c.page_id
  where c.tsv @@ query
  order by ts_rank(c.tsv, query) desc
  limit greatest(match_count, 1);
end;
$$;

comment on function public.search_polytech_chunks is
  'Retrieval du RAG : renvoie les passages polytech.sn les plus pertinents pour une question (full-text français).';

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.polytech_pages enable row level security;
alter table public.polytech_chunks enable row level security;
alter table public.rag_query_log enable row level security;

-- Contenu scrapé public par nature (déjà publié sur polytech.sn) : lecture
-- ouverte à tous. Aucune policy d'écriture : seul le service role (utilisé
-- par le script de scraping) peut insérer/modifier/supprimer.
drop policy if exists "polytech_pages_public_read" on public.polytech_pages;
create policy "polytech_pages_public_read"
  on public.polytech_pages for select
  using (true);

drop policy if exists "polytech_chunks_public_read" on public.polytech_chunks;
create policy "polytech_chunks_public_read"
  on public.polytech_chunks for select
  using (true);

-- rag_query_log : aucune policy publique. Seul le service role (Route
-- Handler /api/chat, exécuté côté serveur) lit/écrit ce journal.
