-- =====================================================================
-- Archives Concours UAM — Assistant IA (RAG sur polytech.sn)
-- =====================================================================
-- Ajoute les tables nécessaires à l'assistant Q/A :
--   - polytech_pages  : une ligne par page scrapée sur polytech.sn
--   - polytech_chunks : les pages découpées en passages indexés (full-text)
--   - rag_query_log   : journal minimal pour le rate-limiting par IP
--
-- Idempotent : peut être relancé sans erreur.
-- =====================================================================

create extension if not exists "pgcrypto";

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
  tsv tsvector generated always as (to_tsvector('french', content)) stored,
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
language sql
stable
as $$
  select
    c.id as chunk_id,
    p.url as page_url,
    p.title as page_title,
    p.section as section,
    c.content as content,
    ts_rank(c.tsv, websearch_to_tsquery('french', search_query)) as rank
  from public.polytech_chunks c
  join public.polytech_pages p on p.id = c.page_id
  where
    search_query is not null
    and length(trim(search_query)) > 0
    and c.tsv @@ websearch_to_tsquery('french', search_query)
  order by rank desc
  limit greatest(match_count, 1);
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
