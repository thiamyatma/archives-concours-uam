# Scalabilité et performance

Ce document explique **chaque optimisation** mise en place et **pourquoi**.
Le passage des archives (PDF en base) à des fichiers Markdown git-versionnés
a supprimé la quasi-totalité des préoccupations de performance qui
existaient auparavant (cache applicatif, pagination, index SQL sur la
table `documents`) : il n'y a simplement plus de base de données à
interroger pour ces pages. Ce qui reste ci-dessous couvre le rendu des
pages départements/archives et l'assistant IA (seule partie du site qui
parle encore à Supabase).

## Sommaire

- [Départements et archives : rendu 100% statique](#départements-et-archives--rendu-100-statique)
- [Pourquoi aucun cache n'est nécessaire ici](#pourquoi-aucun-cache-nest-nécessaire-ici)
- [Déduplication de requêtes (React cache())](#déduplication-de-requêtes-react-cache)
- [Rendu Markdown sans JavaScript client](#rendu-markdown-sans-javascript-client)
- [Assistant IA (RAG)](#assistant-ia-rag)
- [Ce qui n'a délibérément pas été fait](#ce-qui-na-délibérément-pas-été-fait)

## Départements et archives : rendu 100% statique

Toutes les pages `/`, `/departements`, `/departements/[code]` et
`/departements/[code]/[annee]` sont **statiques** (`generateStaticParams`
associé à `dynamicParams = false`) : chaque combinaison (département,
année) connue au build est pré-rendue en HTML une fois pour toutes, à
partir des fichiers sous `content/archives/**`. La sortie de `next build`
doit afficher `○` (statique) pour chacune de ces routes, jamais `ƒ`
(dynamique).

Conséquence directe : **aucune fonction serverless ne lit le système de
fichiers à l'exécution**. `fs.readdirSync`/`fs.readFileSync`
(`lib/content/fs.ts`) ne s'exécutent que pendant `next build`, qui tourne
sur un checkout git complet — `content/archives/**` y est garanti présent.
Une future page qui aurait besoin de contenu non connu au build (recherche
plein texte sur les épreuves, par exemple) devrait repenser ce point :
elle ne pourrait plus être un simple `fs.readFileSync` en Server Component
statique.

## Pourquoi aucun cache n'est nécessaire ici

L'ancienne architecture (documents en base) avait deux niveaux de cache
(`unstable_cache` inter-requêtes + React `cache()` intra-requête) pour
éviter de recontacter Supabase à chaque visite. Avec un contenu résolu une
fois pour toutes au build, il n'y a plus rien à mettre en cache à
l'exécution : le HTML généré au build **est** déjà le résultat final,
servi tel quel (éventuellement via un CDN) pour chaque requête.

## Déduplication de requêtes (React `cache()`)

`lib/data/departements.ts` enveloppe malgré tout ses fonctions dans React
`cache()` : `generateMetadata()` et le composant de page d'une même route
appellent tous les deux `getConcoursContent`/`getDepartementAnnees` — sans
`cache()`, ce serait deux lectures + parsing du même fichier à chaque
génération statique. `cache()` déduplique ces deux appels au sein d'un même
rendu (aucun bénéfice supplémentaire ici puisqu'il n'y a pas d'E/S réseau
à économiser, mais évite un parsing Markdown redondant).

## Rendu Markdown sans JavaScript client

`components/shared/markdown-renderer.tsx` est un **Server Component** :
`react-markdown` et ses plugins (`remark-gfm`, `remark-math`,
`rehype-katex`) n'ont besoin d'aucune API navigateur, donc le rendu d'une
épreuve (potentiellement une page assez longue, avec formules KaTeX)
n'ajoute aucun JavaScript au bundle envoyé au visiteur — cohérent avec la
philosophie du projet (voir `docs/ARCHITECTURE.md`) de ne charger du JS
client que là où l'interactivité l'exige réellement.

## Assistant IA (RAG)

Seule partie du site qui parle encore à une base de données. Ses propres
optimisations (recherche full-text Postgres plutôt qu'un vector store,
rate-limiting par IP hashée, chargement paresseux du widget de chat) sont
détaillées dans [docs/RAG.md](RAG.md) et n'ont pas changé avec ce
passage aux archives Markdown.

## Ce qui n'a délibérément pas été fait

- **Pas de recherche plein texte sur les épreuves** : la navigation
  demandée (Départements → département → années → épreuve) ne prévoit pas
  d'étape recherche, et le volume (quelques fichiers par département) ne
  le justifie pas. Si ce besoin apparaît, il faudrait indexer le contenu
  quelque part (Postgres full-text comme pour le RAG, ou une recherche
  côté client sur un index généré au build) plutôt que de scanner le
  système de fichiers à l'exécution.
- **Pas de pagination sur la liste des années d'un département** : le
  nombre d'années archivées par département reste faible (quelques
  entrées), contrairement à l'ancienne liste de documents PDF qui pouvait
  accumuler des dizaines de lignes. Une liste simple suffit
  (`components/shared/departement-years-list.tsx`).
