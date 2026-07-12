# Politique de sécurité

## Signaler une vulnérabilité

Si vous découvrez une faille de sécurité (accès non autorisé aux documents
non approuvés, contournement des policies RLS, fuite de la clé service role,
faille XSS/injection, etc.), merci de **ne pas** ouvrir d'issue publique.

Contactez plutôt directement : **thiamibrahimayatus@gmail.com**

Merci d'inclure :

- Une description du problème et de son impact potentiel
- Les étapes pour reproduire (URL, requête, payload)
- Une suggestion de correctif si vous en avez une

Nous accusons réception sous 72h et visons une correction pour les failles
critiques sous 7 jours.

## Périmètre

Sont notamment concernés :

- `lib/supabase/service.ts` et toute fuite de la clé `service_role`
- Les policies RLS de `supabase/schema.sql` (accès aux documents `pending`/
  `rejected`, aux emails de `contributors`, etc.)
- Les Server Actions (`lib/actions/*`) — validation, autorisation, injection
- L'authentification admin (`/admin/login`, middleware)

## Bonnes pratiques déjà en place

- Bucket Storage privé : tout accès passe par une URL signée à courte durée
  générée côté serveur (jamais d'URL publique directe).
- RLS activé sur toutes les tables ; seuls les documents `approved` sont
  lisibles publiquement.
- Validation Zod côté client **et** serveur sur toutes les entrées
  utilisateur.
- Clé `service_role` isolée dans un module `server-only`, jamais exposée au
  client.

## Dépendances

Les dépendances sont auditées via `npm audit`. Les mises à jour de sécurité
sont appliquées dès que possible après validation par la CI.
