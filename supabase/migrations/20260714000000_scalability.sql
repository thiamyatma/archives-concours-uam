-- =====================================================================
-- Archives Concours UAM — Optimisations de scalabilité
-- =====================================================================
-- Voir docs/PERFORMANCE.md pour le détail de chaque changement.
-- Idempotent : peut être relancé sans erreur.
-- =====================================================================

-- ---------------------------------------------------------------------
-- get_global_stats() : 3 sous-requêtes -> 1 seul scan agrégé.
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
    count(*),
    coalesce(sum(downloads), 0),
    count(distinct uploaded_by)
  from public.documents
  where status = 'approved';
$$;

grant execute on function public.get_global_stats() to anon, authenticated;

-- ---------------------------------------------------------------------
-- RPC: nombre de documents approuvés par filière (group by en base
-- plutôt qu'un fetch de toutes les lignes compté côté application).
-- ---------------------------------------------------------------------

create or replace function public.get_filiere_document_counts()
returns table (
  filiere_id uuid,
  document_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select filiere_id, count(*)
  from public.documents
  where status = 'approved'
  group by filiere_id;
$$;

grant execute on function public.get_filiere_document_counts() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Index additionnels (partiels sur status = 'approved' : taille et coût
-- d'écriture stables même si le volume pending/rejected grossit).
-- ---------------------------------------------------------------------

create index if not exists documents_approved_filiere_idx
  on public.documents (filiere_id)
  where status = 'approved';

create index if not exists documents_approved_browse_idx
  on public.documents (annee desc, matiere)
  where status = 'approved';

create index if not exists documents_uploaded_by_idx
  on public.documents (uploaded_by);
