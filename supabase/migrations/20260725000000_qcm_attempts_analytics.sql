-- =====================================================================
-- Analytics QCM : enrichit qcm_attempts (voir docs/qcm-entrainement.md)
-- =====================================================================
-- Ajoute le score, la durée, le département et un identifiant anonyme de
-- candidat (candidate_id) à chaque tentative, pour alimenter le tableau de
-- bord Analytics QCM (/admin/analytics).
--
-- Non destructif : toutes les nouvelles colonnes sont NULLABLE, donc les
-- lignes déjà enregistrées (compteur simple, avant cette évolution) restent
-- valides — elles apparaissent juste sans détail de score dans les stats.
--
-- candidate_id n'est PAS un compte utilisateur : c'est un jeton aléatoire
-- généré dans le navigateur et conservé en localStorage, qui permet de
-- suivre la progression d'un même appareil sans authentification.
-- =====================================================================

alter table public.qcm_attempts
  add column if not exists departement_code text,
  add column if not exists candidate_id text,
  add column if not exists total_questions integer,
  add column if not exists correct_answers integer,
  add column if not exists score_percent integer,
  add column if not exists duration_seconds integer;

-- Bornes de cohérence (appliquées uniquement quand la valeur est présente,
-- donc sans impact sur les anciennes lignes NULL).
alter table public.qcm_attempts
  drop constraint if exists qcm_attempts_score_percent_range;
alter table public.qcm_attempts
  add constraint qcm_attempts_score_percent_range
  check (score_percent is null or (score_percent between 0 and 100));

-- Index pour les requêtes filtrées du tableau de bord.
create index if not exists qcm_attempts_completed_at_idx
  on public.qcm_attempts (completed_at desc);

create index if not exists qcm_attempts_candidate_idx
  on public.qcm_attempts (candidate_id, completed_at);

create index if not exists qcm_attempts_departement_idx
  on public.qcm_attempts (departement_code);
