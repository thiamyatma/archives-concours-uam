-- =====================================================================
-- Vérification "Je suis admis" — inscriptions de contrôle (admin-only)
-- =====================================================================
-- `concours_inscriptions` contient la liste (nom + email) fournie par
-- chaque département pour l'année en cours, importée depuis
-- /admin/inscriptions (voir lib/actions/inscriptions.ts). Sert UNIQUEMENT à
-- vérifier qu'un candidat qui se déclare admis figure bien sur cette liste,
-- avant de lui donner le lien d'invitation WhatsApp de son département
-- (contest_settings.whatsapp_links) — jamais exposée publiquement, aucune
-- policy publique, comme admin_users/exam_documents.
--
-- `nom_normalise`/`email_normalise` sont calculés côté application
-- (lib/text/normalize.ts, réutilisé par lib/resultats/search.ts) au moment
-- de l'import ET de la vérification, pour comparer sans tenir compte des
-- accents/de la casse — pas de fonction de normalisation dupliquée côté
-- SQL. La contrainte unique sur (annee, email_normalise) permet un import
-- corrigé (ré-import du même email = mise à jour, pas un doublon).
--
-- `concours_verifications` : simple compteur d'événements (une ligne par
-- vérification réussie), même principe que exam_document_views/pdf_downloads
-- — aucune donnée personnelle, juste de quoi savoir combien de candidats
-- ont récupéré leur lien, par département, pour le dashboard admin.
-- =====================================================================

create table if not exists public.concours_inscriptions (
  id uuid primary key default gen_random_uuid(),
  departement_code text not null,
  annee integer not null check (annee between 2000 and 2100),
  nom text not null,
  nom_normalise text not null,
  email text not null,
  email_normalise text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists concours_inscriptions_email_annee_idx
  on public.concours_inscriptions (annee, email_normalise);

create index if not exists concours_inscriptions_lookup_idx
  on public.concours_inscriptions (annee, email_normalise, nom_normalise);

create index if not exists concours_inscriptions_departement_idx
  on public.concours_inscriptions (departement_code, annee);

create table if not exists public.concours_verifications (
  id uuid primary key default gen_random_uuid(),
  departement_code text not null,
  annee integer not null,
  verified_at timestamptz not null default now()
);

create index if not exists concours_verifications_lookup_idx
  on public.concours_verifications (departement_code, annee);

alter table public.concours_inscriptions enable row level security;
alter table public.concours_verifications enable row level security;
-- Aucune policy publique sur les 2 tables : lu/écrit uniquement par le
-- service role (import admin + vérification serveur).
