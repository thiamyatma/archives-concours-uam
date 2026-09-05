# Vérification "Je suis admis"

## Vue d'ensemble

Contrairement aux résultats publics (`/resultats`, voir le README —
git-versionnés, aucune donnée personnelle), cette fonctionnalité gère de
vraies coordonnées de candidats (nom + email) fournies par les départements.
Elle vit donc **exclusivement en base Supabase**, jamais dans le repo git.

Un candidat qui se déclare admis entre son nom et son email sur
`/verification` ; si la paire correspond exactement à une ligne importée par
son département pour l'année en cours, il reçoit le lien d'invitation
WhatsApp de ce département.

```
Admin (/admin/inscriptions) ── colle "nom,email" par ligne
        │
        ▼
lib/inscriptions/parse.ts (pur, testé)  ──►  lib/actions/inscriptions.ts#importInscriptions
        │                                          │
        │                                          ▼
        │                                  concours_inscriptions (Supabase, service-role only)
        │
        └─ contest_settings.whatsapp_links (un lien par département, /admin/parametres)

Candidat (/verification) ── nom + email
        │
        ▼
lib/actions/inscriptions.ts#verifyCandidate
        │  1. rate-limit par IP (lib/rate-limit.ts)
        │  2. lib/inscriptions/data.ts#findInscription (nom ET email normalisés)
        │  3. si trouvé → contest_settings.whatsapp_links[département]
        ▼
components/verification/verification-form.tsx (affiche le lien ou une erreur générique)
```

## Import des inscriptions (admin)

`/admin/inscriptions` — un formulaire par import : choisir le département,
coller le texte reçu du chef de département (une ligne par candidat,
`nom,email` — virgule, point-virgule ou tabulation acceptés ; une éventuelle
ligne d'en-tête est ignorée automatiquement). Aucun upload de fichier :
copier-coller depuis le tableur suffit, ce qui évite toute dépendance de
parsing Excel/CSV côté serveur.

- L'année est **toujours** `contest_settings.year` au moment de l'import —
  jamais une valeur envoyée par le client, pour ne pas pouvoir écrire dans
  une autre année par erreur ou manipulation.
- Un ré-import du même email (même année) **met à jour** la ligne existante
  (upsert sur `(annee, email_normalise)`) plutôt que de créer un doublon :
  une liste corrigée peut être recollée telle quelle.
- « Vider » un département supprime toutes ses inscriptions pour l'année en
  cours (utile avant un ré-import complet propre).

## Normalisation et correspondance

`nom`/`email` sont comparés via `lib/text/normalize.ts` (accents et casse
ignorés, espaces superflus retirés) — le même utilitaire que la recherche
d'un candidat admis (`lib/resultats/search.ts`), pour tolérer les petites
variations de saisie entre l'inscription initiale et la vérification.

La requête de vérification exige **les deux** (nom ET email) dans la même
condition `WHERE`, pour ne jamais distinguer côté réponse "email connu mais
nom différent" de "email inconnu" — même logique de non-énumération que
`loginAdmin` (voir `lib/actions/admin-auth.ts`). Ce n'est cependant pas un
système d'authentification à protéger comme un mot de passe : confirmer
qu'une paire nom+email précise correspond à un admis n'expose rien de plus
sensible que `/resultats`, déjà public.

## Liens WhatsApp

Un lien par département dans `contest_settings.whatsapp_links` (onglet
**WhatsApp** de `/admin/parametres`), validé côté serveur (doit commencer
par `https://` ou être vide — voir `lib/contest/schema.ts`). Un département
sans lien renseigné renvoie un message "inscription confirmée, lien pas
encore disponible" plutôt qu'un lien cassé ou une fausse erreur de
vérification.

## Sécurité

- `concours_inscriptions`/`concours_verifications` : RLS activé, aucune
  policy publique — lu/écrit uniquement par le service role (import admin +
  vérification serveur), comme `admin_users`/`exam_documents`.
- `verifyCandidate` est rate-limité par IP (10 tentatives / 15 min via
  `lib/rate-limit.ts`) pour empêcher un script de deviner une paire
  nom/email valide par force brute.
- `concours_verifications` est un simple compteur anonyme (département +
  horodatage, pas de nom/email) pour savoir combien de candidats ont
  récupéré leur lien — même principe que `exam_document_views`.
