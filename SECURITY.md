# Politique de sécurité

## Signaler une vulnérabilité

Si vous découvrez une faille de sécurité (contournement des policies RLS,
fuite de la clé service role, faille XSS/injection, etc.), merci de **ne
pas** ouvrir d'issue publique.

Contactez plutôt directement : **thiamibrahimayatus@gmail.com**

Merci d'inclure :

- Une description du problème et de son impact potentiel
- Les étapes pour reproduire (URL, requête, payload)
- Une suggestion de correctif si vous en avez une

Nous accusons réception sous 72h et visons une correction pour les failles
critiques sous 7 jours.

## Périmètre

Les pages départements/archives (`/`, `/departements/**`) sont du contenu
statique généré au build, sans base de données, sans compte utilisateur et
sans formulaire — leur surface d'attaque est minimale. Sont concernés :

- `lib/supabase/service.ts` et toute fuite de la clé `service_role`
  (utilisée uniquement par l'assistant IA)
- Les policies RLS de `supabase/schema.sql` (tables de l'assistant IA)
- `app/api/chat/route.ts` — validation des entrées, rate-limiting
- Le rendu Markdown des épreuves (`components/shared/markdown-renderer.tsx`)
  — injection via un fichier `content/archives/**` malveillant

## Bonnes pratiques déjà en place

- RLS activé sur toutes les tables Supabase restantes (assistant IA).
- Clé `service_role` isolée dans un module `server-only`, jamais exposée au
  client.
- Le contenu Markdown des épreuves n'est modifiable que par commit git
  (revue de code), pas par un formulaire public.

## Dépendances

Les dépendances sont auditées via `npm audit`. Les mises à jour de sécurité
sont appliquées dès que possible après validation par la CI.
