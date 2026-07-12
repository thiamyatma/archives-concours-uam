import type { DocumentMatiere, DocumentStatus, DocumentType } from "@/types/database";

export const SITE_NAME = "Archives Concours UAM";
export const SITE_SLOGAN =
  "Retrouvez gratuitement les anciennes épreuves des concours d'entrée de l'UAM.";
export const SITE_DESCRIPTION =
  "Plateforme communautaire et gratuite pour consulter, télécharger et partager les anciennes épreuves du concours d'entrée de l'Université Amadou Mahtar Mbow (UAM).";

export const MATIERES: { value: DocumentMatiere; label: string }[] = [
  { value: "mathematiques", label: "Mathématiques" },
  { value: "physique_chimie", label: "Physique-Chimie" },
  { value: "anglais", label: "Anglais" },
  { value: "logique", label: "Logique" },
];

export const MATIERE_LABELS: Record<DocumentMatiere, string> = {
  mathematiques: "Mathématiques",
  physique_chimie: "Physique-Chimie",
  anglais: "Anglais",
  logique: "Logique",
};

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "sujet", label: "Sujet" },
  { value: "corrige", label: "Corrigé" },
];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  sujet: "Sujet",
  corrige: "Corrigé",
};

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Refusé",
};

/** Un concours complet = 4 matières x (1 sujet + 1 corrigé) = 8 fichiers. */
export const FILES_PER_COMPLETE_YEAR = MATIERES.length * DOCUMENT_TYPES.length;

export const CURRENT_YEAR = new Date().getFullYear();

/** Bornes raisonnables pour le filtre "année" du formulaire de contribution. */
export const MIN_ARCHIVE_YEAR = 2010;

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 Mo

export const CONTACT_EMAIL = "contact@archives-concours-uam.sn";
