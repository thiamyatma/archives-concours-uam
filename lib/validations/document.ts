import { z } from "zod";
import { MAX_FILE_SIZE_BYTES, MIN_ARCHIVE_YEAR } from "@/lib/constants";

export const matiereEnum = z.enum([
  "mathematiques",
  "physique_chimie",
  "anglais",
  "logique",
]);

export const documentTypeEnum = z.enum(["sujet", "corrige"]);

/**
 * Validation côté client (react-hook-form) : `file` est un `File` du navigateur.
 */
const anneeSchema = z
  .number()
  .int()
  .min(MIN_ARCHIVE_YEAR, `L'année doit être ${MIN_ARCHIVE_YEAR} ou postérieure`)
  .max(new Date().getFullYear(), "L'année ne peut pas être dans le futur");

export const contributionFormSchema = z.object({
  filiereId: z.string().uuid({ message: "Sélectionnez une filière" }),
  annee: anneeSchema,
  matiere: matiereEnum,
  type: documentTypeEnum,
  description: z.string().max(500, "500 caractères maximum").optional().default(""),
  contributorName: z
    .string()
    .max(120, "120 caractères maximum")
    .optional()
    .or(z.literal("")),
  contributorEmail: z
    .string()
    .email("Adresse email invalide")
    .optional()
    .or(z.literal("")),
  file: z
    .instanceof(File, { message: "Sélectionnez un fichier PDF" })
    .refine((file) => file.type === "application/pdf", {
      message: "Seuls les fichiers PDF sont acceptés",
    })
    .refine((file) => file.size <= MAX_FILE_SIZE_BYTES, {
      message: "Le fichier ne doit pas dépasser 20 Mo",
    }),
});

/** Forme des champs gérés par react-hook-form avant validation (ex : description optionnelle). */
export type ContributionFormInput = z.input<typeof contributionFormSchema>;
/** Forme obtenue après validation Zod (ex : description toujours une string). */
export type ContributionFormValues = z.output<typeof contributionFormSchema>;

/**
 * Validation côté serveur (Server Action) : le fichier arrive via FormData.
 */
export const contributionServerSchema = contributionFormSchema.extend({
  annee: z.coerce.number().pipe(anneeSchema),
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, "Fichier vide")
    .refine((file) => file.type === "application/pdf", {
      message: "Seuls les fichiers PDF sont acceptés",
    })
    .refine((file) => file.size <= MAX_FILE_SIZE_BYTES, {
      message: "Le fichier ne doit pas dépasser 20 Mo",
    }),
});

export const reportFormSchema = z.object({
  documentId: z.string().uuid(),
  reason: z
    .string()
    .min(10, "Décrivez le problème en au moins 10 caractères")
    .max(500, "500 caractères maximum"),
  reporterEmail: z.string().email().optional().or(z.literal("")),
});

export type ReportFormValues = z.infer<typeof reportFormSchema>;

export const adminRejectSchema = z.object({
  documentId: z.string().uuid(),
  reason: z.string().min(5, "Précisez un motif de refus").max(500),
});

export const libraryFiltersSchema = z.object({
  q: z.string().optional(),
  filiere: z.string().optional(),
  annee: z.coerce.number().int().optional(),
  matiere: matiereEnum.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export type LibraryFilters = z.infer<typeof libraryFiltersSchema>;
