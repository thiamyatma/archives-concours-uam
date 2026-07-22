# Gestion et téléchargement des PDF d'épreuves

Chaque page d'épreuve (`/departements/[code]/[annee]`) propose un bouton
« Télécharger le PDF » donnant le fichier **combiné** de la session (toutes
matières), en plus de la lecture en ligne du Markdown. Les PDF sont gérés
depuis la page admin **Gestion des épreuves** (`/admin/epreuves`) — import,
publication, remplacement, suppression — qui **remplace** le dépôt manuel
via CLI/dashboard Supabase utilisé avant.

## Indépendance vis-à-vis du contenu Markdown

Le PDF (téléchargement) et le Markdown (contenu affiché,
`content/archives/**`) sont deux systèmes **indépendants**. Uploader un PDF
depuis `/admin/epreuves` ne crée ni ne modifie de fichier Markdown, et
inversement. Conséquence : un département+année n'a besoin **que** d'un PDF
publié pour avoir une page publique consultable (voir « Page publique
auto-générée » ci-dessous), même sans aucun contenu Markdown — mais si les
deux existent, le Markdown prime toujours pour l'affichage (le PDF reste
disponible en téléchargement à côté).

## Bucket Supabase utilisé

**`exam-pdfs`** — privé, `application/pdf` uniquement, 50 Mo max par
fichier. Créé par `supabase/migrations/20260717000000_pdf_downloads.sql`
(reflété dans `supabase/schema.sql`).

## Modèle de données

- **`exam_documents`** : un document = un fichier PDF, une année, une
  description optionnelle, un statut (`publie`/`brouillon`).
- **`exam_document_departments`** : table de liaison — un document peut
  couvrir **plusieurs départements** (ex. un même PDF pour DSTI+DGAE+DSTAAN).
  Contrainte `unique (departement_code, annee)` : un département donné ne
  peut être lié qu'à **un seul** document par année (le doublon est rejeté
  avec un message clair à l'import).
- **`exam_document_views`** : compteur de consultations de page (voir plus
  bas), indépendant des téléchargements.

## Structure des fichiers dans Storage

Le chemin est calculé à l'import à partir des départements **réellement
sélectionnés**, triés et joints par `-` (pas d'un groupe figé dans
`lib/departements.ts`) :

```
exam-pdfs/
  dgae-dsti-dstaan/2025/concours-uam.pdf   # un document, 3 départements liés
  dgo-du2adt/2024/concours-uam.pdf
  du2adt/2025/nom-document.pdf             # document propre à un seul département
```

Un même fichier physique est référencé par tous les départements liés — pas
de duplication d'octets. Voir `lib/pdf/slugify.ts` (`buildDocumentStoragePath`).

## Page admin : Gestion des épreuves (`/admin/epreuves`)

- **Import** : glisser-déposer ou sélection d'un ou plusieurs PDF. Chaque
  fichier obtient sa propre carte avec un mini-formulaire (départements —
  sélection multiple —, année, description optionnelle, statut). Validation
  côté serveur systématique : type PDF réel (signature `%PDF-` vérifiée sur
  les octets uploadés, pas seulement le type déclaré par le navigateur),
  taille max, doublon département+année.
- **Upload direct navigateur → Supabase Storage**, jamais via notre
  serveur : Vercel plafonne le corps des requêtes serverless à ~4,5 Mo, très
  en dessous de PDF réels (un exemple en production fait 9,18 Mo). Le flux :
  1. Server Action `createUploadUrl` (`lib/actions/exam-documents.ts`, admin
     uniquement) valide et génère une URL d'upload signée
     (`createSignedUploadUrl`).
  2. Le navigateur envoie le fichier directement à cette URL via
     `XMLHttpRequest` (pas `fetch`, qui n'expose la progression d'upload
     dans aucun navigateur) — voir `lib/hooks/use-file-upload.ts` pour le
     format exact attendu par Supabase Storage.
  3. Server Action `confirmUpload` vérifie le contenu réel du fichier et
     enregistre les métadonnées.
- **Tableau des documents** : départements, année, nom du fichier, taille,
  date d'ajout, statut, vues, téléchargements. Actions : Consulter,
  Télécharger, Modifier les métadonnées, Remplacer le PDF, Publier/Dépublier,
  Supprimer.
- Toutes les Server Actions de gestion appellent `requireAdminSession()`
  elles-mêmes (pas seulement le layout de la page) : une Server Action reste
  invocable directement, indépendamment du rendu de la page qui l'englobe.

## Page publique auto-générée pour les épreuves PDF-seul

Les pages `/departements/[code]/[annee]` utilisaient jusqu'ici
`dynamicParams = false` : un département+année inconnu au build (donc sans
Markdown) était un 404 **dur**, jamais généré à la demande. Ce n'est plus le
cas — `dynamicParams = true` désormais, pour qu'une épreuve publiée
uniquement en PDF ait immédiatement une page publique, sans redéploiement :

1. La page tente d'abord `getConcoursContent` (Markdown, comportement
   inchangé).
2. Si absent, `getPdfOnlyDocument` (`lib/data/exam-documents.ts`) cherche un
   document **publié** lié à ce département+année ; si trouvé, une vue de
   repli est rendue (titre, description éventuelle, bouton télécharger, et un
   bouton **« Consulter le PDF »**) au lieu des sections Markdown. Le PDF
   n'est **jamais chargé au montage** : `PdfInlineViewer` n'appelle
   `getDocumentPreviewUrl` qu'au clic explicite, puis affiche une `iframe`
   vers l'URL signée. Cette URL (TTL 1 h, une lecture pouvant durer plusieurs
   minutes) est **mise en cache et partagée** par (département, année)
   pendant 50 min (`unstable_cache`, tag `EXAM_PREVIEW_CACHE_TAG` invalidé
   par toute mutation admin d'un document) : tous les visiteurs de la fenêtre
   partagent la même URL, donc le fichier bénéficie réellement du cache
   navigateur/CDN au lieu d'être re-téléchargé avec une URL unique à chaque
   fois. L'action est aussi rate-limitée (défense anti-script). Objectif :
   couper l'egress Supabase dû au rechargement automatique du fichier à
   chaque affichage de page.
3. Sinon, 404 normal.

Next.js met ensuite ce rendu en cache comme une page statique classique
(comportement standard de `dynamicParams = true`) : le coût réseau
(recherche du document publié) n'est payé qu'une fois par nouvelle
combinaison département+année, jamais pour les pages Markdown déjà connues
au build.

Pour que ces épreuves soient aussi **listées** (pas seulement atteignables
par lien direct), `DepartementYearsList` (`/departements/[code]`) est un
Client Component qui fusionne, au montage, les années PDF-seul (`Server
Action getAdditionalYears`) avec la liste Markdown déjà affichée par le
serveur — la page elle-même reste 100% statique, comme le reste du site
(voir `docs/PERFORMANCE.md`).

## Permissions (RLS)

Aucune policy publique sur `exam_documents`, `exam_document_departments`,
`exam_document_views` ni sur le bucket : seul le **service role**
(`lib/supabase/service.ts`) lit/écrit.

## Flux de téléchargement (page publique)

1. **Au montage du bouton** (`components/shared/download-pdf-button.tsx`,
   `lib/hooks/use-download-pdf.ts`) : `checkExamPdfAvailability`
   (`lib/actions/download-pdf.ts`) résout directement le document publié lié
   à ce département+année (plus de `storage.list()` en boucle — une requête
   en base, plus rapide que l'ancien système à base de dossiers partagés).
2. **Au clic** : `getExamPdfDownloadUrl` génère une **URL signée** de 60
   secondes (`createSignedUrl(path, 60, { download: fileName })`),
   enregistre un événement dans `pdf_downloads` (best-effort), renvoie
   l'URL. Le navigateur télécharge directement depuis Supabase Storage.
3. Toast de succès/erreur (`sonner`), événement GA4 `download_subject`, et
   `recordDocumentView` (compteur de consultations, best-effort,
   rate-limité par IP+département+année pour éviter qu'un simple rechargement
   ne gonfle le compteur).

## Statistiques et mini-dashboard admin

`/admin` (statistiques de téléchargement, RPC sur `pdf_downloads`) et
`/admin/epreuves` (gestion des documents, RPC `get_exam_documents_with_stats`
sur `exam_documents` + agrégats `pdf_downloads`/`exam_document_views`)
partagent la même authentification par **mot de passe unique**
(`ADMIN_PASSWORD`) — voir `lib/actions/admin-auth.ts`.

## Variables d'environnement ajoutées

| Variable         | Rôle                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN_PASSWORD` | Mot de passe de `/admin/login` (et clé de signature du cookie). Sans elle, la connexion admin est toujours refusée — le reste du site fonctionne normalement. |
