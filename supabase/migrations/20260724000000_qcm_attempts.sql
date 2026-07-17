-- =====================================================================
-- Compteur d'utilisation de l'entraînement QCM (voir docs/qcm-entrainement.md)
-- =====================================================================
-- Une ligne par correction générée (clic sur « Voir ma correction »), même
-- principe que exam_document_views : un simple compteur d'événements, pas
-- un suivi de visiteurs identifiés (aucun compte candidat n'existe).
-- =====================================================================

create table if not exists public.qcm_attempts (
  id uuid primary key default gen_random_uuid(),
  groupe text not null,
  annee integer not null,
  matiere text not null,
  completed_at timestamptz not null default now()
);

create index if not exists qcm_attempts_lookup_idx
  on public.qcm_attempts (groupe, annee, matiere);

alter table public.qcm_attempts enable row level security;
-- Aucune policy publique : lu/écrit uniquement par le service role, comme
-- exam_document_views/pdf_downloads.
