/**
 * Source unique pour les contraintes PDF, utilisée à la fois côté serveur
 * (validation) et côté client (pré-vérification dans le dropzone avant
 * même de tenter l'upload). Aucun accès réseau/fs ici, donc pas de
 * `"server-only"` — ce fichier doit rester importable des deux côtés.
 */
export const PDF_BUCKET = "exam-pdfs";

/** Miroir de `file_size_limit` du bucket (voir supabase/schema.sql). */
export const MAX_PDF_SIZE_BYTES = 52_428_800;

export const PDF_MIME_TYPE = "application/pdf";

/**
 * `Cache-Control: max-age` (en secondes) posé sur l'objet Storage à
 * l'upload. Volontairement très long (1 an) : un PDF d'épreuve est un
 * contenu immuable — un remplacement crée un NOUVEAU chemin de stockage
 * (jamais une réécriture au même chemin), donc aucun risque de servir un
 * contenu périmé. Un `max-age` long maximise les hits de cache
 * navigateur/CDN sur les re-consultations d'un même fichier, ce qui réduit
 * l'egress *uncached* (facturé plus cher) — première cause du dépassement
 * observée (voir docs/pdf-downloads.md).
 */
export const PDF_UPLOAD_CACHE_CONTROL_SECONDS = "31536000";

/**
 * Tag de revalidation du cache des URL signées d'épreuve (aperçu ET
 * téléchargement — voir lib/actions/download-pdf.ts). Invalidé par toute
 * action admin qui change le fichier ou sa disponibilité (publication,
 * remplacement, déplacement, suppression) — sinon une URL cachée
 * pointerait vers un `storage_path` obsolète après un remplacement.
 */
export const EXAM_PREVIEW_CACHE_TAG = "exam-document-preview";
