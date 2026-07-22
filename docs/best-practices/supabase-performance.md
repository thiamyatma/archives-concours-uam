# Performance, egress et coût Supabase — standards

Ce document est né d'un **incident réel** : ~9 Go d'egress Supabase
(6,4 Go facturés + 2,77 Go servis depuis le cache) consommés en 10 jours,
sur un projet de **33 Mo de base**, **14 Mo de Storage** et **2 utilisateurs
actifs**. Il documente les causes, les correctifs, et les règles à appliquer
systématiquement pour ne pas reproduire l'erreur.

Complémentaire à [PERFORMANCE.md](../PERFORMANCE.md) (stratégie de rendu
statique/ISR) : ici on traite du **volume de données transféré** et de son
coût.

## Sommaire

- [L'incident : les faits](#lincident--les-faits)
- [Pourquoi autant d'egress ?](#pourquoi-autant-degress-)
- [Causes racines](#causes-racines)
- [Erreurs d'architecture à éviter](#erreurs-darchitecture-à-éviter)
- [Bonnes pratiques retenues](#bonnes-pratiques-retenues)
- [Solutions mises en place](#solutions-mises-en-place)
- [Impacts](#impacts)
- [Checklist avant mise en production](#checklist-avant-mise-en-production)

## L'incident : les faits

| Métrique                     | Valeur    |
| ---------------------------- | --------- |
| Egress facturé (uncached)    | 6,4 Go    |
| Egress servi depuis le cache | 2,77 Go   |
| Taille de la base            | 33 Mo     |
| Taille du Storage            | 14 Mo     |
| Utilisateurs actifs (MAU)    | 2         |
| Quota du plan Free           | 5 Go/mois |

Répartition : le graphe « Egress per day » était **quasi monochrome** —
un seul type dominait à ~95 %. Par élimination (base minuscule, 0 Realtime,
0 Edge Function, 2 utilisateurs Auth), c'était le **Storage**, donc les PDF.

Chronologie décisive :

- **≤ 13 juil** : egress ≈ 0 — aucun PDF publié.
- **15 juil** : premiers PDF publiés → l'egress démarre.
- **16-17 juil** : **pic à 3,5 Go sur 2 jours**, exactement quand un PDF de
  **19,4 Mo** est publié.
- **18-22 juil** : palier de ~450 Mo/jour.

3,5 Go ÷ 19,4 Mo ≈ **180 téléchargements complets du même fichier en
2 jours** — impossible avec 2 utilisateurs humains. Signature d'un accès
**automatisé** (crawler exécutant le JavaScript).

## Pourquoi autant d'egress ?

Le point à retenir : **le volume stocké n'a aucun rapport avec le volume
transféré**. 14 Mo stockés peuvent générer des gigaoctets d'egress si le
même fichier est re-servi des centaines de fois.

Trois mécanismes se sont cumulés, chacun transformant _chaque affichage_ en
_transfert complet facturé_ :

1. **Chargement automatique** — le PDF était injecté dans une `<iframe>` au
   **montage** du composant, donc à chaque visite ET à chaque passage de
   crawler (Googlebot exécute le JS : il déclenche l'iframe comme un
   utilisateur). Aucun clic requis.
2. **URL signée unique à chaque appel** — `createSignedUrl()` renvoie une URL
   avec un token différent à chaque invocation. Une URL différente = **clé de
   cache différente** = cache navigateur/CDN systématiquement contourné.
3. **`Cache-Control: no-cache` sur les objets** — 3 des 4 PDF portaient
   `no-cache` (uploadés hors du flux applicatif). Revalidation forcée à
   chaque requête → egress **uncached**, facturé au tarif fort, même pour un
   contenu strictement identique.

Résultat : un crawler visitant une page = 19,4 Mo transférés, à chaque
passage, sans jamais bénéficier d'un cache.

## Causes racines

| #   | Cause                                                              | Fichier concerné                                      |
| --- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| 1   | Ressource lourde chargée au montage, sans action utilisateur       | `components/shared/pdf-inline-viewer.tsx`             |
| 2   | URL signée régénérée à chaque appel (jamais cachable)              | `lib/actions/download-pdf.ts`                         |
| 3   | `Cache-Control: no-cache` / `max-age` court sur les objets Storage | upload hors flux app + `lib/hooks/use-file-upload.ts` |
| 4   | Server Action publique sans rate-limit                             | `getDocumentPreviewUrl`                               |
| 5   | Lectures non cachées + `select("*")` sur page `force-dynamic`      | `lib/qcm/analytics.ts`                                |

## Erreurs d'architecture à éviter

**❌ Charger une ressource lourde automatiquement**
Une iframe/vidéo/image lourde montée sans interaction transforme chaque
visite (humaine **ou robot**) en transfert complet. Toujours préférer un
déclenchement explicite quand c'est possible.

**❌ Générer une URL signée à chaque rendu**
Chaque URL unique casse le cache. Si N visiteurs consultent le même fichier,
ils doivent partager **la même URL** pendant une fenêtre donnée.

**❌ Laisser le `Cache-Control` par défaut sur des fichiers immuables**
`no-cache` ou un `max-age` court sur un contenu qui ne change jamais = coût
récurrent pur.

**❌ Supposer qu'un `<button>` protège du trafic robot**
Vrai pour un bouton, **faux** pour tout ce qui se déclenche au montage :
iframe, `useEffect` qui fetch, image, preload.

**❌ Oublier le rate-limit sur une Server Action publique**
Une action non authentifiée est appelable en boucle par n'importe qui.

**❌ `select("*")` par réflexe**
On transfère des colonnes inutiles, et la requête grossit avec le schéma.

**❌ Raisonner « petit projet = petit coût »**
2 utilisateurs ont suffi à dépasser un quota de 5 Go, parce que le coût est
piloté par les **robots** et la **répétition**, pas par le nombre d'humains.

## Bonnes pratiques retenues

### Ressources lourdes (PDF, vidéo, images)

- **Chargement à la demande** (clic explicite) dès que c'est acceptable pour
  l'UX. Afficher les métadonnées + un bouton, pas le fichier.
- `Cache-Control` **long** pour tout contenu immuable. Un fichier dont le
  chemin ne change jamais (un remplacement crée un nouveau chemin) peut
  porter `max-age=31536000` (1 an) sans risque de contenu périmé.
- Envisager un hébergement statique/CDN dédié si le volume grossit.

### URL signées

- **Ne jamais régénérer inutilement.** Mettre la génération en cache
  (`unstable_cache`) par clé métier stable — ici `(département, année)`.
- **TTL > fenêtre de cache.** Règle : `revalidate` strictement inférieur au
  TTL de l'URL, avec une marge. Utilisé ici : TTL 60 min / revalidate
  50 min → une URL servie est toujours valide ≥ 10 min.
- **Invalider explicitement** le cache quand la ressource change (tag +
  `revalidateTag` dans toutes les mutations), sinon on sert un lien mort.
- Arbitrer la durée : une URL partageable plus longtemps est un compromis
  acceptable **pour du contenu public**, jamais pour du contenu sensible.

### Cache — ordre de préférence

1. **Statique / ISR** (rien ne part en base) — voir [PERFORMANCE.md](../PERFORMANCE.md).
2. **Cache CDN / navigateur** (`Cache-Control` sur l'objet + URL stable).
3. **`unstable_cache`** pour les lectures serveur répétées, avec un
   `revalidate` adapté à la fraîcheur réellement nécessaire.
4. **`cache()` React** pour dédupliquer dans un même rendu.

### Requêtes base

- Lister explicitement les colonnes, jamais `select("*")` — **règle ESLint
  appliquée** (`no-restricted-syntax` dans `eslint.config.mjs`), donc bloquée
  en CI. La forme COUNT `select("*", { count, head: true })` reste autorisée :
  elle ne renvoie aucune ligne, donc aucun octet de données.
- Pousser les filtres **en base** (`.eq`, `.gte`), avec les index qui vont
  avec — ne jamais filtrer en mémoire ce que SQL peut filtrer.
- Borner le volume (`limit`) même quand la table est petite aujourd'hui.
- Cacher les lectures des pages `force-dynamic` rafraîchies souvent
  (dashboards, filtres interactifs).

### Rate limiting

- **Toute Server Action publique doit être analysée** : a-t-elle besoin d'un
  rate-limit ? Si elle déclenche un travail coûteux (génération d'URL,
  requête lourde, écriture), la réponse est oui.
- Calibrer pour ne pas gêner un usage légitime : un plafond trop bas casse
  l'UX, un plafond absent laisse passer les scripts.

## Solutions mises en place

| PR  | Correctif                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #41 | Aperçu PDF chargé **au clic** uniquement ; URL signée cachée/partagée (`unstable_cache`, TTL 1 h / revalidate 50 min) ; rate-limit sur `getDocumentPreviewUrl` ; invalidation par tag sur les mutations admin |
| #42 | `cacheControl` à l'upload porté à **1 an** ; URL de **téléchargement** également cachée et partagée (rate-limit et log conservés **par clic**)                                                                |
| —   | **Objets existants corrigés** : les 4 PDF passés de `no-cache`/`3600` à `max-age=31536000` (octets vérifiés intacts après re-upload)                                                                          |
| #43 | Lectures du dashboard Analytics QCM mises en cache (`unstable_cache`) + `select` explicite                                                                                                                    |

## Impacts

### Performance

- Les pages contenant un PDF s'affichent **immédiatement** : plus de
  téléchargement de plusieurs Mo bloquant le rendu initial.
- Les re-consultations sont servies depuis le cache navigateur/CDN
  (latence quasi nulle au lieu d'un transfert complet).
- Dashboard admin : requêtes redondantes supprimées entre deux
  changements de filtres.

### Coût

- **Supabase** : suppression de la principale source d'egress. Les fetchs
  répétés du même fichier deviennent des _cache hits_ (facturés moins cher)
  au lieu d'egress _uncached_. Objectif : repasser durablement sous les 5 Go
  du plan Free.
- **Vercel** : moins de temps de fonction serverless (moins d'appels aux
  Server Actions), et surtout aucun octet de PDF ne transite par le serveur
  (upload/download direct navigateur ↔ Supabase).

### SEO

- **Positif** : un crawler ne télécharge plus des mégaoctets par page — le
  budget de crawl est consacré au contenu réel, et le temps de chargement
  (signal de classement) s'améliore nettement.
- **Neutre côté contenu** : le PDF n'était de toute façon pas indexé comme
  contenu de la page (iframe). Les pages Markdown, elles, restent
  intégralement indexables.

### UX

- **Gain** : affichage instantané, pas d'attente imposée pour un fichier que
  l'utilisateur n'a peut-être pas demandé — précieux sur mobile et connexion
  lente (contexte réel des candidats).
- **Coût assumé** : un clic supplémentaire pour consulter le PDF. Compromis
  volontaire, largement favorable.

### Sécurité

- **Amélioration** : rate-limit ajouté sur une Server Action publique qui
  n'en avait pas.
- **Compromis maîtrisé** : les URL signées vivent plus longtemps (1 h) et
  sont partagées entre visiteurs — acceptable **uniquement** parce qu'il
  s'agit de PDF publics sans confidentialité. Cette technique ne doit
  **jamais** être appliquée à du contenu privé ou nominatif.
- Inchangé : bucket privé, aucune policy publique, service role exclusif.

## Checklist avant mise en production

À dérouler pour **toute** fonctionnalité, avant de la considérer terminée.

### Performance

- [ ] Aucune ressource lourde chargée automatiquement (iframe, vidéo, image,
      fetch au montage) là où un chargement à la demande est possible.
- [ ] Rendu statique/ISR privilégié ; `force-dynamic` justifié quand utilisé.
- [ ] Aucun travail répété inutilement entre deux rendus.

### Cache

- [ ] `Cache-Control` adapté sur tout fichier servi (long si immuable).
- [ ] URL signées **stables** sur une fenêtre, jamais régénérées à chaque
      rendu.
- [ ] `revalidate` < TTL de l'URL signée, avec marge.
- [ ] Invalidation (`revalidateTag`) branchée sur **toutes** les mutations
      concernées.
- [ ] Lectures répétées des pages dynamiques mises en cache.

### Coût / egress

- [ ] Estimation : « si un robot visite cette page 100 fois, combien
      d'octets partent ? »
- [ ] Impact chiffré sur l'egress Supabase et sur les fonctions Vercel.
- [ ] Aucun octet de fichier volumineux ne transite par le serveur
      applicatif.

### Base de données

- [ ] Pas de `select("*")` — colonnes explicites (vérifié automatiquement
      par ESLint, mais rester attentif aux colonnes inutiles listées à la
      main).
- [ ] Filtres poussés en base, index présents.
- [ ] `limit` borné.

### Sécurité

- [ ] Toute Server Action publique analysée pour le rate-limit ; décision
      justifiée.
- [ ] Actions d'administration protégées par `requireAdminSession()` dans
      l'action elle-même (pas seulement le layout).
- [ ] Validation Zod des entrées côté serveur.
- [ ] Aucune donnée sensible dans une URL à durée de vie longue ou partagée.

### Scalabilité

- [ ] Le comportement reste sain si le volume de données ×100.
- [ ] Rien qui grossisse linéairement avec la table sans borne.

### SEO

- [ ] Métadonnées présentes ; pages destinées à l'indexation réellement
      indexables.
- [ ] Pas de coût de crawl inutile (ressources lourdes auto-chargées).

### UX / Accessibilité

- [ ] États de chargement, d'erreur et vides gérés.
- [ ] Interactions au clavier, libellés ARIA, `prefers-reduced-motion`
      respecté quand il y a de l'animation.

### Vérification

- [ ] `format` / `lint` / `type-check` / `test` / `build` verts.
- [ ] Comportement vérifié dans un vrai navigateur quand c'est possible ;
      sinon, la limite est explicitement signalée.
