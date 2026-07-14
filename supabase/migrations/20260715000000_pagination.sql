-- =====================================================================
-- Archives Concours UAM — Index pour la pagination admin des contributeurs
-- =====================================================================
-- Voir docs/PERFORMANCE.md / la section "Pagination" pour le contexte.
-- Idempotent : peut être relancé sans erreur.
-- =====================================================================

-- Sert le tri "plus récents d'abord" de la liste admin des contributeurs
-- (LIMIT/OFFSET sur created_at desc), sans quoi ce tri exigerait un scan
-- complet + sort en mémoire une fois la table volumineuse.
create index if not exists contributors_created_at_idx
  on public.contributors (created_at desc);
