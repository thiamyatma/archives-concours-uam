-- =====================================================================
-- Liens d'invitation WhatsApp par département (vérification "Je suis admis")
-- =====================================================================
-- Un lien d'invitation par département (voir lib/departements.ts), éditable
-- depuis /admin/parametres — mêmes raisons que `partner` avant lui (pas de
-- déploiement pour changer un lien, historique des modifications). Clé =
-- code département (`dsti`, `dgae`, ...), valeur = URL "https://…". Défaut
-- '{}' : aucun lien tant que l'admin n'a rien renseigné (voir
-- lib/contest/schema.ts pour la validation du format).
-- =====================================================================

alter table contest_settings
  add column if not exists whatsapp_links jsonb not null default '{}'::jsonb;
