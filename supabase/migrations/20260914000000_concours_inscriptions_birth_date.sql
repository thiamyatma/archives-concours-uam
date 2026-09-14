-- Remplace la vérification par email par nom + date de naissance.
alter table public.concours_inscriptions
  add column if not exists date_naissance text,
  add column if not exists date_naissance_normalisee text;

alter table public.concours_inscriptions
  alter column email drop not null,
  alter column email_normalise drop not null;

drop index if exists public.concours_inscriptions_email_annee_idx;

create unique index if not exists concours_inscriptions_candidate_annee_idx
  on public.concours_inscriptions (annee, nom_normalise, date_naissance_normalisee);

create index if not exists concours_inscriptions_lookup_birth_date_idx
  on public.concours_inscriptions (annee, nom_normalise, date_naissance_normalisee);