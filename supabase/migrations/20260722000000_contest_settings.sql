-- =====================================================================
-- Comptes administrateurs + Paramètres du concours administrables
-- =====================================================================
-- 1. admin_users : remplace le mot de passe unique partagé par de vrais
--    comptes email + mot de passe (haché scrypt, jamais en clair). Voir
--    lib/auth/password.ts et lib/actions/admin-auth.ts.
-- 2. contest_settings : ligne singleton pilotant toutes les infos du concours
--    affichées sur le site (dates, messages, bannière, compte à rebours,
--    boutons, infos pratiques). Editée depuis /admin/parametres. Voir
--    docs/contest-settings.md.
-- =====================================================================

-- ---------------------------------------------------------------------
-- admin_users
-- ---------------------------------------------------------------------
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;
-- Aucune policy publique : lu/écrit uniquement par le service role
-- (lib/actions/admin-auth.ts).

-- Seed des 2 comptes. Les hachés scrypt (sel:hash) sont calculés hors repo ;
-- aucun mot de passe en clair ici. `on conflict do nothing` : idempotent, ne
-- réécrase pas un hash déjà présent (ex. mot de passe changé plus tard).
insert into admin_users (email, password_hash) values
  (
    'thiamibrahimayatus@gmail.com',
    '596f4d3018322211813270f4befc2c68:724b7228dc181b7d011d08a40f855bb2476e2a965e868209dc41f2505e9f2b3b398c66b61957ca025241eed7f92f5cbc26028e293aa9b4b750cec308aff1514e'
  ),
  (
    'matzo07@gmail.com',
    '502235b08c7a786854f427be9caf4262:3575f4466cf3caedd184bc49b9efb57c1147bc63ef438428046c8c33807ca13e0a4ab44064f4bbb802334347e4969c38d651a069edad1388d6eab28294d4fad8'
  )
on conflict (email) do nothing;

-- ---------------------------------------------------------------------
-- contest_settings (singleton, même pattern que admin_session_state)
-- ---------------------------------------------------------------------
create table if not exists contest_settings (
  id boolean primary key default true,
  year integer not null,
  official_name text not null,
  subtitle text not null default '',
  description text not null default '',
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  contest_date timestamptz,
  results_date timestamptz,
  messages jsonb not null default '{}'::jsonb,
  banner jsonb not null default '{}'::jsonb,
  countdown jsonb not null default '{}'::jsonb,
  buttons jsonb not null default '{}'::jsonb,
  info jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint contest_settings_singleton check (id)
);

drop trigger if exists contest_settings_set_updated_at on contest_settings;
create trigger contest_settings_set_updated_at
  before update on contest_settings
  for each row execute function public.set_updated_at();

alter table contest_settings enable row level security;
-- Aucune policy publique : lu/écrit uniquement par le service role
-- (lib/contest/settings.ts, lib/actions/contest-settings.ts).

-- Seed du singleton avec les valeurs par défaut (état actuel du site).
insert into contest_settings (
  id, year, official_name, subtitle, description,
  registration_opens_at, registration_closes_at, contest_date, results_date,
  messages, banner, countdown, buttons, info
) values (
  true,
  2026,
  'Concours d''entrée Polytech Diamniadio 2026',
  'École Supérieure Polytechnique de Diamniadio — Université Amadou Mahtar Mbow de Dakar',
  'Concours d''entrée de l''UAM.',
  '2026-07-23T00:00:00+00:00',
  '2026-08-16T23:59:59+00:00',
  '2026-08-22T08:00:00+00:00',
  null,
  jsonb_build_object(
    'beforeRegistration', 'Les inscriptions ouvriront bientôt.',
    'duringRegistration', 'Les inscriptions au concours sont ouvertes jusqu''au {dateClotureInscriptions}.',
    'afterRegistration', 'Les inscriptions sont terminées. Le concours aura lieu le {dateConcours}.',
    'contestDay', 'Le concours a lieu aujourd''hui ! Bonne chance à tous les candidats.',
    'afterContest', 'Le concours est terminé.',
    'beforeResults', 'Les résultats seront publiés prochainement.',
    'afterResults', 'Les résultats sont disponibles.'
  ),
  jsonb_build_object(
    'enabled', false,
    'title', '',
    'message', '',
    'type', 'info',
    'color', ''
  ),
  jsonb_build_object(
    'enabled', true,
    'floatingWidget', false,
    'position', 'right',
    'showSeconds', true,
    'showProgress', false
  ),
  jsonb_build_object(
    'primaryLabel', 'Consulter les anciennes épreuves',
    'primaryUrl', '/departements',
    'secondaryLabel', 'Déposer mon dossier',
    'secondaryUrl', 'https://depot.uam.sn/concours'
  ),
  jsonb_build_object(
    'location', '',
    'convocationTime', '',
    'startTime', '',
    'documents', '',
    'allowedMaterial', '',
    'instructions', '',
    'officialUrl', 'https://depot.uam.sn/concours'
  )
)
on conflict (id) do nothing;
