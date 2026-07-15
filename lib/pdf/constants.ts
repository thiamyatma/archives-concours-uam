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
