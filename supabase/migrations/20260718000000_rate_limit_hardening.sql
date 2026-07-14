-- Durcissement du rate-limiting :
-- 1. Remplace le check-then-insert du RAG (deux allers-retours séparés,
--    donc racy sous requêtes concurrentes) par une RPC atomique (verrou
--    advisory transactionnel autour du check + insert).
-- 2. Ajoute un limiteur générique par IP+action, utilisé pour les deux
--    Server Actions publiques qui n'avaient jusqu'ici aucune protection :
--    la connexion admin (lib/actions/admin-auth.ts) et la génération de
--    lien de téléchargement PDF (lib/actions/download-pdf.ts).

create or replace function check_and_record_rag_rate_limit(
  p_ip_hash text,
  p_limit integer
) returns table (allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  -- Sérialise check+insert pour une même IP : élimine la fenêtre de race
  -- où deux requêtes concurrentes liraient toutes les deux un compte encore
  -- sous la limite avant qu'aucune des deux insertions n'ait eu lieu.
  perform pg_advisory_xact_lock(hashtext('rag_rate_limit:' || p_ip_hash));

  select count(*) into v_count
  from rag_query_log
  where ip_hash = p_ip_hash
    and created_at >= now() - interval '24 hours';

  if v_count >= p_limit then
    return query select false, 0;
  end if;

  insert into rag_query_log (ip_hash) values (p_ip_hash);
  return query select true, greatest(p_limit - v_count - 1, 0);
end;
$$;

revoke all on function check_and_record_rag_rate_limit(text, integer) from public;
grant execute on function check_and_record_rag_rate_limit(text, integer) to service_role;

create table if not exists action_rate_limits (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists action_rate_limits_lookup_idx
  on action_rate_limits (action, key_hash, created_at);

alter table action_rate_limits enable row level security;
-- Aucune policy publique (ni lecture ni écriture) : lu/écrit uniquement par
-- le service role via check_action_rate_limit ci-dessous, même principe que
-- rag_query_log et pdf_downloads.

create or replace function check_action_rate_limit(
  p_key_hash text,
  p_action text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_action || ':' || p_key_hash));

  select count(*) into v_count
  from action_rate_limits
  where action = p_action
    and key_hash = p_key_hash
    and created_at >= now() - (p_window_seconds::text || ' seconds')::interval;

  if v_count >= p_limit then
    return false;
  end if;

  insert into action_rate_limits (key_hash, action) values (p_key_hash, p_action);
  return true;
end;
$$;

revoke all on function check_action_rate_limit(text, text, integer, integer) from public;
grant execute on function check_action_rate_limit(text, text, integer, integer) to service_role;
