-- =====================================================================
-- Téléchargement PDF des épreuves : bucket Storage + log des
-- téléchargements. Aucune policy publique — seul le service role (déjà
-- utilisé par l'assistant IA, voir lib/supabase/service.ts) lit/écrit ici.
-- Les PDF eux-mêmes sont uploadés manuellement par l'administrateur
-- (CLI/dashboard Supabase), pas via l'application.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Table: pdf_downloads (log d'événements, insert-only)
-- ---------------------------------------------------------------------

create table if not exists public.pdf_downloads (
  id uuid primary key default gen_random_uuid(),
  departement_code text not null,
  annee integer not null check (annee between 2000 and 2100),
  file_name text not null,
  downloaded_at timestamptz not null default now()
);

comment on table public.pdf_downloads is
  'Log des téléchargements de PDF d''épreuves (un événement par clic réussi). Écrit uniquement par le service role, depuis lib/actions/download-pdf.ts.';

create index if not exists pdf_downloads_departement_idx on public.pdf_downloads (departement_code);
create index if not exists pdf_downloads_annee_idx on public.pdf_downloads (annee);
create index if not exists pdf_downloads_downloaded_at_idx on public.pdf_downloads (downloaded_at desc);

alter table public.pdf_downloads enable row level security;
-- Aucune policy : ni lecture ni écriture publique. Le service role
-- contourne RLS par construction, donc l'app (et l'admin) y accèdent
-- normalement sans qu'aucune policy explicite soit nécessaire.

-- ---------------------------------------------------------------------
-- Bucket Storage : exam-pdfs (privé)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exam-pdfs', 'exam-pdfs', false, 52428800, array['application/pdf'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Aucune policy storage.objects non plus : dépôt et lecture réservés au
-- service role. L'administrateur uploade les PDF via le dashboard Supabase
-- ou la CLI (authentifié avec ses propres identifiants de projet), pas via
-- l'application publique.

-- ---------------------------------------------------------------------
-- RPC : statistiques de téléchargement pour le mini-dashboard admin.
-- Non accessibles à anon/authenticated — seul le service role (page admin,
-- protégée par mot de passe applicatif) les appelle.
-- ---------------------------------------------------------------------

create or replace function public.get_pdf_download_stats()
returns table (total_downloads bigint, total_files_downloaded bigint)
language sql
stable
as $$
  select count(*), count(distinct (departement_code, annee))
  from public.pdf_downloads;
$$;

revoke all on function public.get_pdf_download_stats() from public;
grant execute on function public.get_pdf_download_stats() to service_role;

create or replace function public.get_pdf_downloads_by_departement()
returns table (departement_code text, downloads bigint)
language sql
stable
as $$
  select departement_code, count(*)
  from public.pdf_downloads
  group by departement_code
  order by count(*) desc;
$$;

revoke all on function public.get_pdf_downloads_by_departement() from public;
grant execute on function public.get_pdf_downloads_by_departement() to service_role;

create or replace function public.get_pdf_downloads_by_annee()
returns table (annee integer, downloads bigint)
language sql
stable
as $$
  select annee, count(*)
  from public.pdf_downloads
  group by annee
  order by annee desc;
$$;

revoke all on function public.get_pdf_downloads_by_annee() from public;
grant execute on function public.get_pdf_downloads_by_annee() to service_role;

create or replace function public.get_top_downloaded_pdfs(limit_count integer default 10)
returns table (departement_code text, annee integer, file_name text, downloads bigint)
language sql
stable
as $$
  select departement_code, annee, file_name, count(*)
  from public.pdf_downloads
  group by departement_code, annee, file_name
  order by count(*) desc
  limit greatest(limit_count, 1);
$$;

revoke all on function public.get_top_downloaded_pdfs(integer) from public;
grant execute on function public.get_top_downloaded_pdfs(integer) to service_role;
