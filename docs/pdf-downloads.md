# Téléchargement PDF des épreuves

Chaque page d'épreuve (`/departements/[code]/[annee]`) propose un bouton
« Télécharger le PDF » donnant le fichier **combiné** de la session (toutes
matières), en plus de la lecture en ligne du Markdown. Aucun upload public :
les PDF sont déposés manuellement par l'administrateur dans Supabase
Storage.

## Bucket Supabase utilisé

**`exam-pdfs`** — privé, `application/pdf` uniquement, 50 Mo max par
fichier. Créé par `supabase/migrations/20260717000000_pdf_downloads.sql`
(reflété dans `supabase/schema.sql`).

## Structure des fichiers

Miroir exact de `content/archives/**` (voir `docs/ARCHITECTURE.md`) :

```
exam-pdfs/
  dsti-dgae-dstaan/2025.pdf   # partagé par DSTI, DGAE, DSTAAN
  dsti-dgae-dstaan/2024.pdf
  dgo-du2adt/2024.pdf         # partagé par DGO, DU2ADT
  du2adt/2025.pdf             # exemple d'override propre à un seul département
```

La résolution (`lib/pdf/resolve.ts`, `candidatePdfPaths`) réutilise
`candidateContentPaths` de `lib/content/resolve.ts` : un fichier propre au
département (`<code>/<année>.pdf`) est cherché en premier, le fichier du
groupe partagé (`<contentGroup>/<année>.pdf`) ensuite — exactement la même
logique que pour le Markdown, donc un département peut avoir son propre PDF
une année donnée sans aucune modification de code.

## Ajouter un PDF

1. Repérer le dossier de contenu du département (`lib/departements.ts`,
   champ `contentGroup`).
2. Uploader le fichier via le dashboard Supabase (**Storage → exam-pdfs**)
   ou la CLI, au chemin `<contentGroup-ou-code>/<année>.pdf`.
3. Rien d'autre : le bouton de la page correspondante devient
   automatiquement actif au prochain chargement (vérification faite côté
   client, voir plus bas) — aucun redéploiement nécessaire.

## Permissions (RLS)

Aucune policy publique, ni sur la table `pdf_downloads` ni sur le bucket :
seul le **service role** (`lib/supabase/service.ts`, déjà utilisé par
l'assistant IA) lit/écrit. Plus restrictif que l'ancien système PDF (qui
autorisait un dépôt public) — cohérent avec l'absence totale de
contribution publique dans l'architecture actuelle.

## Flux de téléchargement

1. **Au montage du bouton** (`components/shared/download-pdf-button.tsx`,
   `lib/hooks/use-download-pdf.ts`) : appel à la Server Action
   `checkExamPdfAvailability` (`lib/actions/download-pdf.ts`) — un simple
   `storage.list()` sur le(s) chemin(s) candidat(s), sans générer d'URL.
   Bouton désactivé avec loader pendant la vérification, puis
   activé/désactivé selon le résultat.

   **Pourquoi côté client et pas dans la page ?** Les pages
   `/departements/[code]/[annee]` sont 100% statiques
   (`generateStaticParams` + `dynamicParams = false`, zéro appel réseau au
   build ni à l'exécution — voir `docs/PERFORMANCE.md`). Faire ce contrôle
   dans le Server Component réintroduirait une dépendance Supabase sur des
   pages qui n'en ont jamais eu besoin. Le bouton est donc un **Client
   Component** isolé : la page reste statique, seul le bouton fait un aller
   Supabase, et seulement au clic ou au montage.

2. **Au clic** : `getExamPdfDownloadUrl` valide les entrées (département
   dans l'allow-list `DEPARTEMENTS`, année plausible), résout le chemin,
   génère une **URL signée** de 60 secondes via le client service-role
   (`createSignedUrl(path, 60, { download: fileName })` — le paramètre
   `download` fixe le nom proposé au navigateur, ex. `Concours-UAM_DSTI_2025.pdf`),
   enregistre un événement dans `pdf_downloads` (best-effort : un échec du
   log ne bloque jamais un téléchargement déjà validé), puis renvoie l'URL.
   Le navigateur télécharge directement depuis Supabase Storage — jamais
   par le serveur Next.js.
3. Toast de succès (`sonner`) ou d'erreur, et événement GA4
   `download_subject` (`department`, `year`, `file_name` — voir
   `docs/google-analytics.md`).

Si le fichier n'existe pas (pas encore uploadé, ou faute de frappe dans le
chemin), `getExamPdfDownloadUrl` renvoie une erreur claire affichée en
toast — jamais de lien cassé côté navigateur, jamais de tentative de
téléchargement d'un objet inexistant.

## Statistiques et mini-dashboard admin

Chaque téléchargement réussi ajoute une ligne à `pdf_downloads`
(`departement_code`, `annee`, `file_name`, `downloaded_at`). Les agrégats
(`lib/data/download-stats.ts`) sont calculés en base par 4 RPC Postgres
(même principe que `get_global_stats`, voir `docs/DATABASE.md`) : total,
répartition par département, répartition par année, top 10 des fichiers.

**Accès** : `/admin` (protégée) affiche ces statistiques (tuiles, mini
graphiques en barres sans dépendance externe, tableau du top 10).
Authentification par **mot de passe unique** (`ADMIN_PASSWORD`, variable
d'environnement) — pas de comptes, pas de Supabase Auth (volontairement
absente de l'architecture actuelle). Le cookie de session
(`lib/actions/admin-auth.ts`) est auto-vérifiable (payload + signature
HMAC signée avec `ADMIN_PASSWORD`), donc sans état stocké côté serveur.
Proportionné à un usage "une seule personne consulte des stats" — pas un
vrai système multi-admin.

**Note sur la granularité** : le PDF est **combiné par session** (toutes
matières), pas un fichier par matière. Les statistiques sont donc
disponibles par département et par année, mais pas par matière — un seul
événement de téléchargement couvre les 4 matières à la fois.

## Variables d'environnement ajoutées

| Variable         | Rôle                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN_PASSWORD` | Mot de passe de `/admin/login` (et clé de signature du cookie). Sans elle, la connexion admin est toujours refusée — le reste du site fonctionne normalement. |
