-- =====================================================================
-- Archives Concours UAM — Schéma Supabase (PostgreSQL)
-- =====================================================================
-- À exécuter dans l'éditeur SQL du projet Supabase (ou via `supabase db push`).
-- Idempotent : peut être relancé sans erreur.
--
-- Les archives de concours (départements/années/épreuves) ne vivent plus
-- en base : ce sont des fichiers Markdown committés dans le repo
-- (`content/archives/**`), lus directement depuis le système de fichiers
-- au build. La seule donnée persistée ici sert l'assistant IA (RAG).
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- ---------------------------------------------------------------------
-- updated_at trigger (réutilisée par les tables ci-dessous)
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

-- =====================================================================
-- Assistant IA (RAG sur polytech.sn) — voir migrations/20260713000000_polytech_rag.sql
-- =====================================================================

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
-- updated_at trigger (réutilise la fonction déjà définie plus haut)
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
