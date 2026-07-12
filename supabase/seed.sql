-- =====================================================================
-- Archives Concours UAM — Données initiales
-- =====================================================================

insert into public.filieres (code, nom, description) values
  ('dsti', 'DSTI', 'Département Sciences et Techniques de l''Ingénieur — formation aux métiers de l''ingénierie et des technologies appliquées.'),
  ('dgae', 'DGAE', 'Département Gestion et Administration des Entreprises — sciences de gestion, comptabilité et management.'),
  ('dstan', 'DSTAN', 'Département Sciences et Techniques Agricoles et Numériques — agronomie, environnement et numérique.'),
  ('du2adt', 'DU2ADT', 'Département Urbanisme, Aménagement du Territoire et Développement Territorial.'),
  ('dgo', 'DGO', 'Département Gouvernance et Organisations — sciences politiques, droit et gouvernance publique.')
on conflict (code) do update
  set nom = excluded.nom,
      description = excluded.description;
