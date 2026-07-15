-- 1. Révocation de session admin : le cookie admin est un HMAC
--    auto-vérifiable sans état côté serveur (voir lib/actions/admin-auth.ts),
--    donc jusqu'ici un cookie capturé avant la déconnexion restait valide
--    jusqu'à son expiration (7 jours). Une seule ligne "horodatage de
--    dernière révocation" suffit pour un usage mono-admin : se déconnecter
--    invalide tous les cookies émis avant cet instant.

create table if not exists admin_session_state (
  id boolean primary key default true,
  revoked_at timestamptz not null default now(),
  constraint admin_session_state_singleton check (id)
);

insert into admin_session_state (id) values (true) on conflict (id) do nothing;

alter table admin_session_state enable row level security;
-- Aucune policy publique : lu/écrit uniquement par le service role, depuis
-- lib/actions/admin-auth.ts.

-- 2. Corrige le bucket exam-pdfs : la migration d'origine (20260717000000)
--    ne remettait pas `public` à jour dans son ON CONFLICT DO UPDATE, donc
--    un re-run ne pouvait pas corriger le bucket si quelqu'un l'avait
--    manuellement basculé en public. Force la valeur correcte maintenant.

update storage.buckets set public = false where id = 'exam-pdfs';
