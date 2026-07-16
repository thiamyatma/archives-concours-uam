-- =====================================================================
-- Paramètres du concours — PR 2 : historique, SEO, statistiques
-- =====================================================================
-- 1. contest_settings_history : une ligne par champ modifié à chaque
--    enregistrement depuis /admin/parametres (voir lib/contest/history.ts).
--    admin_email est dénormalisé (pas de FK vers admin_users) : l'historique
--    reste lisible même si un compte est supprimé plus tard.
-- 2. contest_settings gagne deux colonnes jsonb : `seo` (SEO de la page
--    d'accueil) et `stats` (toggles d'affichage des compteurs).
-- =====================================================================

create table if not exists contest_settings_history (
  id uuid primary key default gen_random_uuid(),
  changed_at timestamptz not null default now(),
  admin_email text not null,
  field_path text not null,
  old_value text,
  new_value text
);

create index if not exists contest_settings_history_changed_at_idx
  on contest_settings_history (changed_at desc);

alter table contest_settings_history enable row level security;
-- Aucune policy publique : lu/écrit uniquement par le service role.

alter table contest_settings
  add column if not exists seo jsonb not null default '{}'::jsonb,
  add column if not exists stats jsonb not null default '{}'::jsonb;

update contest_settings
set
  seo = jsonb_build_object('title', '', 'description', '', 'ogImageUrl', '', 'keywords', ''),
  stats = jsonb_build_object('showExams', true, 'showDownloads', true, 'showViews', true)
where id = true
  and (seo = '{}'::jsonb or stats = '{}'::jsonb);
