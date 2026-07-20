-- =====================================================================
-- Encart partenaire (page d'accueil) — lien MoneyFusion éditable
-- =====================================================================
-- Le lien de paiement et le numéro de téléphone de l'encart partenaire
-- (components/thiam-sciences-promo.tsx) étaient en dur dans le code. Un
-- lien de paiement ne doit pas nécessiter un déploiement pour être changé,
-- et doit rester vérifiable dans l'historique des modifications
-- (contest_settings_history). Colonne nullable-friendly (défaut '{}') :
-- les valeurs réelles sont seedées ci-dessous pour ne pas casser l'affichage
-- tant que l'admin n'a rien modifié.
-- =====================================================================

alter table contest_settings
  add column if not exists partner jsonb not null default '{}'::jsonb;

update contest_settings
set partner = jsonb_build_object(
  'enabled', true,
  'registrationUrl', 'https://my.moneyfusion.net/6a5d6d2812d1319228efbad8',
  'phoneDisplay', '+221 76 942 52 91',
  'phoneHref', 'tel:+221769425291'
)
where id = true
  and partner = '{}'::jsonb;
