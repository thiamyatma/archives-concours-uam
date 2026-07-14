# Scalabilité et performance

Ce document explique **chaque optimisation** mise en place pour que la
plateforme tienne la charge (plusieurs milliers d'utilisateurs simultanés
visés), et **pourquoi** — certaines existaient déjà dans l'architecture de
base, d'autres ont été ajoutées spécifiquement pour ce passage à l'échelle.

## Sommaire

- [Rendu : Server Components, statique, dynamique](#rendu-server-components-statique-dynamique)
- [Cache applicatif (unstable_cache + tags)](#cache-applicatif-unstable_cache--tags)
- [Déduplication de requêtes (React cache())](#déduplication-de-requêtes-react-cache)
- [Requêtes Supabase et index SQL](#requêtes-supabase-et-index-sql)
- [Pagination](#pagination)
- [Téléchargement des PDF](#téléchargement-des-pdf)
- [Lazy loading](#lazy-loading)
- [Minimiser les appels réseau](#minimiser-les-appels-réseau)
- [Scalabilité horizontale et connexions DB](#scalabilité-horizontale-et-connexions-db)
- [Ce qui n'a délibérément pas été fait](#ce-qui-na-délibérément-pas-été-fait)

## Rendu : Server Components, statique, dynamique

| Page                                              | Stratégie                                                | Pourquoi                                                                                                                            |
| ------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/` (accueil)                                     | Server Component, ISR `revalidate=3600`                  | Contenu public identique pour tous, change rarement (validation admin)                                                              |
| `/filieres`                                       | Server Component, ISR `revalidate=3600`                  | Idem                                                                                                                                |
| `/filieres/[code]`                                | Server Component, **SSG** (`generateStaticParams`) + ISR | 5 filières connues au build : générées statiquement, régénérées à la demande                                                        |
| `/filieres/[code]/[annee]`                        | Server Component, ISR (pas de SSG)                       | Combinaisons filière×année non bornées à l'avance ; générée à la première visite puis mise en cache                                 |
| `/bibliotheque`                                   | Server Component, **dynamique**                          | Dépend de `searchParams` (recherche/filtres/pagination) : par nature propre à chaque requête                                        |
| `/contribuer`                                     | Server Component, ISR `revalidate=3600`                  | Liste des filières pour le formulaire, change rarement                                                                              |
| `/admin`, `/admin/(dashboard)/*`                  | **`force-dynamic`**                                      | Contenu privé propre à l'utilisateur connecté — ne doit jamais être mis en cache statique (voir `app/admin/(dashboard)/layout.tsx`) |
| `/sitemap.xml`, `/robots.txt`, `/opengraph-image` | Statique / ISR                                           | Générés par convention de fichiers Next.js, aucune personnalisation                                                                 |

**Server Components partout où c'est possible** : aucune donnée n'est
récupérée côté client par défaut. Les seuls Client Components sont ceux qui
ont réellement besoin d'interactivité (formulaires, dialogues, filtres,
tableau admin) — voir `docs/ARCHITECTURE.md`. Chaque octet de JS envoyé au
navigateur a un coût multiplié par le nombre de visiteurs simultanés ; ce
choix minimise ce coût par défaut plutôt que de le corriger après coup.

**Rendu dynamique seulement quand nécessaire** : `/bibliotheque` (recherche
utilisateur) et `/admin/*` (session utilisateur) sont les deux seules
sections vraiment dynamiques du site. Tout le reste est statique/ISR.

## Cache applicatif (`unstable_cache` + tags)

Avant ce changement, les pages ISR avaient un `revalidate` court (60-300s)
comme **seul** mécanisme de fraîcheur : à l'échelle, ça veut dire une
requête Supabase de régénération toutes les quelques minutes, pour
potentiellement rien (aucun document n'a changé). À la place :

1. **`lib/data/stats.ts` et `lib/data/filieres.ts`** enveloppent les lectures
   publiques globales (`getGlobalStats`, `getFilieresWithStats`,
   `getFiliereByCode`, `getFiliereArchive`, `getAllFilieres`) dans
   `unstable_cache(..., { tags: ["global-stats"] | ["filieres"], revalidate: 3600 })`.
   Le TTL de 3600s n'est qu'un **filet de sécurité** — la vraie fraîcheur
   vient de l'invalidation à la demande.
2. **`lib/actions/admin.ts`** appelle `revalidateTag("global-stats")`,
   `revalidateTag("filieres")` et `revalidatePath()` ciblé (`/`,
   `/bibliotheque`, `/filieres/[code]`, `/filieres/[code]/[annee]`) dans
   `approveDocument`/`rejectDocument`/`deleteDocument` — donc dans la
   **même seconde** qu'une validation admin, toutes les pages publiques
   concernées sont invalidées et régénérées au prochain accès, sans
   attendre le TTL.

Résultat : sous forte charge, ces pages sont servies depuis le cache pour
la quasi-totalité des requêtes (un admin valide un document quelques fois
par jour, pas par seconde), tout en restant fraîches à la seconde près
quand ça compte.

**Client dédié pour les données cacheables** (`lib/supabase/public.ts`) :
`unstable_cache` sert un résultat **partagé entre tous les visiteurs**. Le
client Supabase habituel (`lib/supabase/server.ts`) lit les cookies de
session à chaque appel — correct pour une donnée qui dépend de
l'utilisateur, mais un anti-pattern si le résultat est mis en cache
inter-requêtes (le cache serait implicitement lié à la session de la
première requête qui l'a rempli). Les fonctions listées ci-dessus n'ont
besoin d'aucune session (RLS ouvert en lecture publique), donc elles
utilisent `createPublicClient()` — un client anonyme sans cookies.

Effet de bord positif : `app/sitemap.ts` appelle ces mêmes fonctions et,
ne touchant donc plus du tout aux cookies, a pu redevenir une route
statique avec ISR (visible dans la sortie de `next build` : `○` au lieu de
`ƒ`) au lieu d'être régénérée à chaque requête.

## Déduplication de requêtes (React `cache()`)

Problème concret trouvé en auditant le code : `app/filieres/[code]/page.tsx`
définit `generateMetadata()` **et** le composant de page, et les deux
appellent `getFiliereByCode(code)` pour la même page — sans rien, c'est
**deux requêtes Supabase identiques** à chaque chargement. Même chose pour
`getDocumentsByFiliereAnnee` sur la page année.

Toutes les fonctions de `lib/data/*.ts` sont maintenant enveloppées dans
`cache()` (React) : au sein d'un même rendu serveur, un deuxième appel avec
les mêmes arguments renvoie le résultat déjà obtenu sans repartir en base.
Combiné à `unstable_cache` pour les lectures globales (voir plus haut), ça
donne deux niveaux de déduplication : intra-requête (`cache()`) et
inter-requêtes (`unstable_cache`).

## Requêtes Supabase et index SQL

### Éviter le comptage en application (le vrai N+1 du projet)

`getFilieresWithStats()` (page d'accueil + index filières) faisait ceci :

```ts
// avant
supabase.from("documents").select("filiere_id").eq("status", "approved");
// puis un for/of en JS pour compter par filiere_id
```

Ça fonctionne à 50 documents. À quelques milliers, c'est une requête qui
transfère **une ligne par document approuvé** pour ensuite les compter côté
Node — le volume transféré et le travail applicatif croissent avec la
table entière, pas avec le nombre de filières (5, fixe). Remplacé par une
fonction Postgres :

```sql
create function public.get_filiere_document_counts()
returns table (filiere_id uuid, document_count bigint)
language sql stable security definer
as $$
  select filiere_id, count(*)
  from public.documents
  where status = 'approved'
  group by filiere_id;
$$;
```

Le `group by` s'exécute en base, sur l'index partiel
`documents_approved_filiere_idx` (voir plus bas) : le résultat transféré est
borné à 5 lignes quel que soit le nombre de documents. Voir
`supabase/migrations/20260714000000_scalability.sql`.

### Éviter les scans multiples

`get_global_stats()` faisait 3 sous-requêtes séparées (une pour le compte,
une pour la somme des téléchargements, une pour le compte de contributeurs
distincts), donc 3 scans de la table `documents`. Réécrite en une seule
requête à agrégats conditionnels :

```sql
select count(*), coalesce(sum(downloads), 0), count(distinct uploaded_by)
from public.documents
where status = 'approved';
```

Un seul scan (index-only sur `documents_status_idx`) au lieu de trois.

### Colonnes sélectionnées

Les pages publiques (bibliothèque, page année) ne sélectionnent plus
`select("*")` mais uniquement les colonnes réellement affichées
(`PUBLIC_DOCUMENT_SELECT` dans `lib/data/documents.ts`) : pas de
`file_url`, `uploaded_by`, `rejection_reason`, `reviewed_at`, `updated_at`
qui n'ont aucun usage côté public. Le type `PublicDocument`
(`types/database.ts`) reflète exactement cette sélection réduite, pour
qu'un futur ajout de champ dans un composant public échoue au typage
plutôt qu'à l'exécution. L'admin (`ADMIN_DOCUMENT_SELECT`) garde `*`, lui,
puisqu'il a besoin de tout (motif de refus, etc.).

### Index ajoutés

Tous les nouveaux index sont **partiels** (`where status = 'approved'`) :
seules les lignes publiquement visibles y entrent, donc leur taille — et le
coût de maintenance à l'écriture — reste stable même si le volume de
documents `pending`/`rejected` grossit beaucoup (contributions non
modérées, spam, etc.).

| Index                                                 | Sert                                                                   |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| `documents_approved_filiere_idx`                      | `get_filiere_document_counts()`, filtre par filière de la bibliothèque |
| `documents_approved_browse_idx (annee desc, matiere)` | Tri par défaut de la bibliothèque, sans sort en mémoire                |
| `documents_uploaded_by_idx`                           | `count(distinct uploaded_by)` de `get_global_stats()`                  |

(Les index déjà présents avant ce passage — `documents_filiere_annee_idx`,
`documents_status_idx`, `documents_matiere_idx`, l'index full-text sur
`description` — restaient pertinents et n'ont pas été touchés.)

### Éviter les N+1 classiques

Aucune boucle n'exécute de requête par ligne dans ce projet : les jointures
(`documents` + `filieres`) se font en une seule requête via l'embed
PostgREST (`select("*, filieres(id,code,nom)")`), jamais par un
`for (const doc of docs) { await getFiliere(doc.filiere_id) }`. Le seul
"N+1" identifié était le comptage côté application décrit ci-dessus,
corrigé par le `group by`.

## Pagination

Pagination unifiée sur toutes les listes de l'application (bibliothèque,
années d'une filière, tableau admin des documents, liste admin des
contributeurs) autour d'un socle commun : `lib/pagination.ts` (types +
utilitaires purs), `components/shared/pagination.tsx` (UI) et
`lib/hooks/use-pagination.ts` (état côté client). Chaque choix ci-dessous
est justifié pour une table `documents` de l'ordre de **plusieurs milliers
de lignes** — pas des millions — ce qui est l'échelle réaliste pour un
dépôt d'épreuves d'examen.

### LIMIT/OFFSET plutôt qu'une pagination par curseur

L'UI cible (`← Précédent 1 2 3 4 5 … 20 Suivant →`) exige de pouvoir sauter
directement à une page arbitraire. Un curseur n'encode que "la ligne après
celle-ci" : il permet un défilement séquentiel (page suivante/précédente)
mais pas de calculer où se trouve la page 7 sans avoir parcouru les pages
1 à 6. Le curseur serait le bon choix pour un flux infini sans numéros de
page ; ce n'est pas le besoin exprimé ici, donc `.range(from, to)`
(LIMIT/OFFSET via PostgREST) reste le choix adapté.

La faiblesse connue d'OFFSET — le coût de la requête croît avec la valeur
de l'offset, Postgres devant parcourir (puis jeter) les lignes précédentes
— ne se manifeste qu'à partir de dizaines/centaines de milliers de lignes
**par combinaison de filtres**. Au volume attendu (quelques milliers de
lignes au total, encore moins une fois filtrées par filière/année/matière),
`OFFSET 5000` reste de l'ordre du milliseconde sur un index adapté. Si le
volume venait à grossir de plusieurs ordres de grandeur, l'étape suivante
serait une pagination par curseur seek (`WHERE (annee, matiere, id) < (...)`)
combinée à une UI "page suivante" sans numéros — un changement d'UX, pas
seulement d'implémentation, donc délibérément hors scope ici.

### Compter seulement quand nécessaire

`count: "exact"` coûte un scan (même index-only) à chaque appel, en plus du
`SELECT` des lignes de la page — un coût payé pour chaque page consultée
alors que le total ne change qu'à l'approbation/au refus/à la suppression
d'un document. Deux stratégies distinctes selon le contexte :

- **Bibliothèque publique** (`lib/data/documents.ts`,
  `fetchApprovedDocumentsCount`) : le compte est un Server Component sans
  état — impossible de "se souvenir" du total d'une requête à l'autre côté
  serveur. Il est donc mis en cache via `unstable_cache`, par combinaison de
  filtres (`q`, `filiereCode`, `annee`, `matiere`), tagué
  `CACHE_TAGS.documents` et invalidé à la demande (`revalidateTag`) dans
  `revalidateDocumentSurfaces` (`lib/actions/admin.ts`) — donc à la seconde
  près après une décision admin, avec un TTL de 5 minutes en filet de
  sécurité. Le fetch des lignes, lui, n'est jamais mis en cache (déjà
  documenté plus haut : trop de combinaisons filtres × page pour que ce
  soit rentable).
- **Tableaux admin pilotés par React Query** (`AdminDashboard`,
  `ContributorsTable`) : le client garde l'état entre les pages, donc pas
  besoin de cache serveur. `count: "exact"` n'est demandé que pour la
  **page 1** d'une combinaison de filtres donnée (`withCount: page === 1`).
  Les pages suivantes lisent le total déjà connu directement dans le cache
  de React Query (`queryClient.getQueryData([...queryKeyBase, 1])`) plutôt
  que de le redemander — une lecture synchrone, sans effet de bord, donc
  compatible avec les contraintes du React Compiler du projet (voir
  ci-dessous).

`count: "exact"` reste adapté tant que la table reste de l'ordre de
quelques milliers de lignes : Postgres répond via l'index de statut sans
scan complet. À plusieurs millions de lignes, l'étape suivante serait
`count: "planned"` (estimation via les statistiques du planificateur,
approximative mais O(1)) — prématuré ici.

### Index ajoutés pour la pagination

`contributors_created_at_idx on public.contributors (created_at desc)`
(`supabase/migrations/20260715000000_pagination.sql`) : la liste admin des
contributeurs trie par date de contribution décroissante à chaque page ;
sans cet index, chaque page au-delà de la première déclenche un tri complet
de la table. Les index déjà en place pour la bibliothèque
(`documents_approved_browse_idx`, voir plus haut) couvrent déjà son tri par
défaut — aucun index supplémentaire n'était nécessaire là.

### UX : pas de vide pendant le chargement

Les tableaux admin utilisent `placeholderData: keepPreviousData` (React
Query v5) : en changeant de page, l'ancien contenu reste affiché (au lieu
d'un état de chargement vide) jusqu'à ce que la nouvelle page arrive — pas
de saut de mise en page, pas de flash. Les pages publiques (Server
Components) obtiennent l'équivalent gratuitement via le fichier de
convention `loading.tsx` (`app/bibliotheque/loading.tsx`,
`app/filieres/[code]/loading.tsx`) : Next.js affiche un squelette identique
à la mise en page réelle pendant la navigation, sans code de gestion d'état
supplémentaire.

### Pourquoi `queryClient.getQueryData` plutôt qu'un `useState`/`useRef`

Le React Compiler de ce projet interdit `setState` dans un `useEffect` pour
de l'état dérivé (`react-hooks/set-state-in-effect`) et interdit même la
lecture/écriture de `useRef.current` pendant le rendu
(`react-hooks/refs`) — donc ni l'un ni l'autre ne pouvait servir à "se
souvenir" du total de la page 1 pendant qu'on navigue vers la page 2.
`queryClient.getQueryData(...)` est une lecture pure et synchrone du cache
déjà maintenu par React Query : aucun état parallèle à synchroniser, aucun
effet de bord pendant le rendu.

### Cas particulier : pagination en mémoire (années d'une filière)

`components/shared/filiere-years-list.tsx` pagine `years.length` (≤ quelques
dizaines d'années) **en mémoire** via `usePagination` +
`years.slice(from, to)`, et non par `.range()` côté Supabase. La donnée
provient de `getFiliereArchive`, qui a déjà agrégé toutes les années d'une
filière en une seule requête pour calculer la complétude de chacune (voir
`lib/data/filieres.ts`) — le travail coûteux (l'agrégation) est déjà fait
avant même de savoir quelle page afficher. Repaginer côté serveur
obligerait soit à ragréger par page (plus de requêtes, pas moins), soit à
étendre l'agrégat pour qu'il sache aussi paginer (complexité qui ne se
justifie pas pour, au grand maximum, quelques dizaines d'éléments).

## Téléchargement des PDF

Déjà en place, confirmé adapté à la charge :

- **Bucket Storage privé** + URL signée de courte durée générée à la
  demande (`lib/actions/download.ts`) : les octets du PDF transitent
  directement entre le navigateur et l'infrastructure de stockage de
  Supabase (CDN), **jamais** par le serveur Next.js. Le serveur applicatif
  ne fait que signer une URL (opération légère) — il ne devient jamais un
  goulot d'étranglement même avec des milliers de téléchargements
  simultanés, puisqu'il ne sert aucun octet de fichier lui-même.
- `cacheControl: "3600"` à l'upload (`lib/actions/contribute.ts`) : le
  contenu d'un PDF ne change jamais pour un chemin donné, donc le
  navigateur/CDN peut le garder en cache sans revalider inutilement.
- Le compteur de téléchargements s'incrémente via une fonction Postgres
  `SECURITY DEFINER` (`increment_document_downloads`) : une opération
  atomique, pas de lecture-puis-écriture depuis l'application qui pourrait
  perdre des incréments sous accès concurrent.

## Lazy loading

- **Images** (logo, mark du navbar) : `next/image` partout, lazy par
  défaut + formats optimisés automatiquement.
- **Aperçu PDF** (`PreviewDialog`, `PdfPreviewDialog`) : l'URL signée n'est
  générée qu'à l'ouverture du dialogue (`onOpenChange`), jamais au
  chargement de la page — un visiteur qui ne clique sur aucun aperçu ne
  déclenche aucune requête pour ça.
- **Widget de chat IA** (`components/chat/chat-widget.tsx`) : monté dans le
  layout racine, donc présent sur **toutes** les pages, mais la majorité
  des visiteurs ne l'ouvriront jamais. `ChatPanel` (logique de chat,
  parsing SSE) est maintenant chargé via `next/dynamic({ ssr: false })` :
  son JS est retiré du bundle initial de chaque page et n'est récupéré que
  si quelqu'un clique réellement sur la bulle. Gain multiplié par le
  nombre de pages vues, puisque le widget est global.

## Minimiser les appels réseau

- Les fetches indépendants sont systématiquement parallélisés
  (`Promise.all`) plutôt qu'enchaînés en séquence — déjà le cas partout
  dans `lib/data/*.ts`.
- Le middleware (`middleware.ts`) est scopé à `/admin/:path*` uniquement
  (voir le `matcher`) : le rafraîchissement de session Supabase (un aller-
  retour réseau) ne s'exécute **pas** sur le trafic public, qui représente
  l'écrasante majorité des requêtes à l'échelle visée.
- Cache + déduplication décrits plus haut : moins d'appels Supabase
  signifie moins d'aller-retours réseau serveur↔Supabase, ce qui compte
  double sous forte charge (chaque appel économisé l'est pour chaque
  utilisateur simultané).

## Scalabilité horizontale et connexions DB

Un point souvent sous-estimé pour "plusieurs milliers d'utilisateurs
simultanés" : le classique goulot d'étranglement serverless est
l'épuisement des connexions Postgres (chaque instance de fonction ouvrant
sa propre connexion). Ce projet **n'y est pas exposé** par construction :
tous les accès aux données (`supabase-js`) passent par **PostgREST**
(l'API REST de Supabase), pas par des connexions Postgres brutes depuis
Next.js. PostgREST gère lui-même son pool de connexions côté Supabase,
donc que l'app tourne sur 1 ou 10 000 instances serverless simultanées
(Vercel), le nombre de connexions Postgres réelles reste maîtrisé sans
configuration supplémentaire.

Le reste de l'architecture est stateless (pas de session en mémoire, pas
de fichiers écrits localement) : chaque requête peut être servie par
n'importe quelle instance, ce qui permet une scalabilité horizontale
directe sur une plateforme serverless (Vercel) sans changement de code.

## Ce qui n'a délibérément pas été fait

- **Pas de cache sur les lignes de `getApprovedDocuments` (bibliothèque)** :
  trop de combinaisons de filtres/recherche/pagination pour un cache
  efficace, et la page est déjà dynamique par nature (`searchParams`). Les
  index existants suffisent à garder chaque requête rapide (20 lignes
  retournées au plus, filtrage sur colonnes indexées). Seul le **compte**
  associé à chaque combinaison de filtres est mis en cache (voir
  [Pagination](#pagination)) — le total change beaucoup moins souvent que
  la page consultée.
- **Pas de cache sur les données admin** (`getAdminDocuments`,
  `getPendingCount`) : dépendent de l'utilisateur connecté et doivent
  refléter l'état réel immédiatement — les mettre en cache introduirait un
  risque de décision admin sur une donnée périmée.
- **Pas de `count: "planned"`** pour l'instant : voir
  [Pagination](#pagination) — prématuré vu le volume de données attendu.
