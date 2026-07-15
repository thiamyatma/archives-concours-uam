-- Système de gestion des PDF d'épreuves via la page admin (remplace le
-- dépôt manuel). Un document peut être lié à plusieurs départements (même
-- PDF partagé) ; un département donné ne peut être lié qu'à UN document par
-- année (voir la contrainte unique sur exam_document_departments).

create table if not exists public.exam_documents (
  id uuid primary key default gen_random_uuid(),
  annee integer not null check (annee between 2000 and 2100),
  file_name text not null,
  storage_path text not null,
  file_size bigint not null,
  description text,
  statut text not null default 'brouillon' check (statut in ('publie', 'brouillon')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists exam_documents_set_updated_at on public.exam_documents;
create trigger exam_documents_set_updated_at
  before update on public.exam_documents
  for each row execute function public.set_updated_at();

-- `annee` est dénormalisée depuis exam_documents uniquement pour porter la
-- contrainte unique ci-dessous.
create table if not exists public.exam_document_departments (
  document_id uuid not null references public.exam_documents(id) on delete cascade,
  departement_code text not null,
  annee integer not null,
  primary key (document_id, departement_code),
  unique (departement_code, annee)
);

create index if not exists exam_document_departments_lookup_idx
  on public.exam_document_departments (departement_code, annee);

create table if not exists public.exam_document_views (
  id uuid primary key default gen_random_uuid(),
  departement_code text not null,
  annee integer not null,
  viewed_at timestamptz not null default now()
);

create index if not exists exam_document_views_lookup_idx
  on public.exam_document_views (departement_code, annee);

alter table public.exam_documents enable row level security;
alter table public.exam_document_departments enable row level security;
alter table public.exam_document_views enable row level security;
-- Aucune policy publique sur les 3 tables : lu/écrit uniquement par le
-- service role, même principe que pdf_downloads/admin_session_state.

create or replace function public.get_exam_documents_with_stats()
returns table (
  id uuid,
  annee integer,
  file_name text,
  storage_path text,
  file_size bigint,
  description text,
  statut text,
  created_at timestamptz,
  updated_at timestamptz,
  departement_codes text[],
  downloads bigint,
  views bigint
)
language sql
stable
as $$
  select
    d.id, d.annee, d.file_name, d.storage_path, d.file_size, d.description, d.statut,
    d.created_at, d.updated_at,
    array_agg(distinct edd.departement_code order by edd.departement_code),
    coalesce(sum(dl.cnt), 0),
    coalesce(sum(vw.cnt), 0)
  from public.exam_documents d
  join public.exam_document_departments edd on edd.document_id = d.id
  left join (
    select departement_code, annee, count(*) cnt
    from public.pdf_downloads
    group by departement_code, annee
  ) dl on dl.departement_code = edd.departement_code and dl.annee = edd.annee
  left join (
    select departement_code, annee, count(*) cnt
    from public.exam_document_views
    group by departement_code, annee
  ) vw on vw.departement_code = edd.departement_code and vw.annee = edd.annee
  group by d.id
  order by d.annee desc, d.file_name;
$$;

revoke all on function public.get_exam_documents_with_stats() from public;
grant execute on function public.get_exam_documents_with_stats() to service_role;
