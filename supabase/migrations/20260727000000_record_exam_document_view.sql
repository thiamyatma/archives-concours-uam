-- =====================================================================
-- Comptage d'une consultation d'épreuve en un seul aller-retour
-- =====================================================================
-- `recordDocumentView` (lib/actions/download-pdf.ts) est déclenché sur
-- chaque page épreuve consultée. Il faisait DEUX appels réseau : un
-- `check_action_rate_limit` puis un `insert` dans `exam_document_views`.
-- Sur un chemin appelé à chaque vue (robots compris), c'est le double de
-- connexions et de latence pour un seul événement.
--
-- Cette fonction fusionne les deux : même limitation (une vue comptée par
-- clé — IP + département + année — et par fenêtre), même table
-- `action_rate_limits`, même verrou advisory transactionnel que
-- `check_action_rate_limit`, mais un seul aller-retour.
--
-- Le plafond est ici implicitement de 1 par fenêtre (`exists` au lieu d'un
-- `count(*) >= p_limit`) : c'est la seule valeur qu'ait jamais utilisée ce
-- compteur, et `exists` s'arrête à la première ligne trouvée. La fonction
-- générique `check_action_rate_limit` reste en place pour les autres actions
-- (téléchargement, aperçu, tentative QCM), qui ont de vrais plafonds > 1.
-- =====================================================================

create or replace function public.record_exam_document_view(
  p_key_hash text,
  p_departement_code text,
  p_annee integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action constant text := 'document_view';
begin
  perform pg_advisory_xact_lock(hashtext(v_action || ':' || p_key_hash));

  if exists (
    select 1
    from public.action_rate_limits
    where action = v_action
      and key_hash = p_key_hash
      and created_at >= now() - (p_window_seconds::text || ' seconds')::interval
  ) then
    return false;
  end if;

  insert into public.action_rate_limits (key_hash, action)
    values (p_key_hash, v_action);
  insert into public.exam_document_views (departement_code, annee)
    values (p_departement_code, p_annee);

  return true;
end;
$$;

revoke all on function public.record_exam_document_view(text, text, integer, integer)
  from public;
grant execute on function public.record_exam_document_view(text, text, integer, integer)
  to service_role;
