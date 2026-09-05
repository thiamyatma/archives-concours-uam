import { z } from "zod";

/**
 * Validation serveur (section 12) des paramètres du concours soumis depuis
 * /admin/parametres. Le client envoie des données sérialisables (dates en
 * chaîne ISO ou null) ; ce schéma valide et transforme les dates en `Date`.
 * Le type inféré correspond à `ContestSettings` (lib/contest/types.ts).
 */

const nullableDate = z
  .union([z.string(), z.null()])
  .transform((value) => (value ? new Date(value) : null))
  .refine((date) => date === null || !Number.isNaN(date.getTime()), {
    message: "Date invalide.",
  });

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Couleur hexadécimale invalide.")
  .or(z.literal(""));

const messagesSchema = z.object({
  beforeRegistration: z.string().max(500),
  duringRegistration: z.string().max(500),
  afterRegistration: z.string().max(500),
  contestDay: z.string().max(500),
  afterContest: z.string().max(500),
  beforeResults: z.string().max(500),
  afterResults: z.string().max(500),
});

const bannerSchema = z.object({
  enabled: z.boolean(),
  title: z.string().max(200),
  message: z.string().max(500),
  type: z.enum(["info", "success", "warning", "error"]),
  color: hexColor,
});

const countdownSchema = z.object({
  enabled: z.boolean(),
  floatingWidget: z.boolean(),
  position: z.enum(["left", "right"]),
  showSeconds: z.boolean(),
  showProgress: z.boolean(),
});

const buttonsSchema = z.object({
  primaryLabel: z.string().max(120),
  primaryUrl: z.string().max(500),
  secondaryLabel: z.string().max(120),
  secondaryUrl: z.string().max(500),
});

const infoSchema = z.object({
  location: z.string().max(300),
  convocationTime: z.string().max(100),
  startTime: z.string().max(100),
  documents: z.string().max(2000),
  allowedMaterial: z.string().max(2000),
  instructions: z.string().max(2000),
  officialUrl: z.string().max(500),
});

const seoSchema = z.object({
  title: z.string().max(70),
  description: z.string().max(300),
  ogImageUrl: z.string().max(500),
  keywords: z.string().max(300),
});

const statsSchema = z.object({
  showExams: z.boolean(),
  showDownloads: z.boolean(),
  showViews: z.boolean(),
});

// Lien "https://" ou chaîne vide — les liens WhatsApp/officiels rendus en
// `href` public doivent exclure un schéma exécutable (ex. "javascript:").
const httpsUrlOrEmpty = z
  .string()
  .max(500)
  .refine((v) => v === "" || /^https:\/\//i.test(v), {
    message: "Doit commencer par https:// (ou être vide).",
  });

// Un enregistrement libre plutôt qu'un objet à clés fixes : les clés sont
// les codes département (lib/departements.ts), déjà validés à l'usage par
// `getDepartementByCode` (lib/actions/inscriptions.ts) — pas de raison de
// dupliquer la liste des 5 départements ici.
const whatsappLinksSchema = z.record(z.string(), httpsUrlOrEmpty);

export const contestSettingsSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  officialName: z.string().min(1, "Nom officiel requis.").max(200),
  subtitle: z.string().max(300),
  description: z.string().max(1000),
  registrationOpensAt: nullableDate,
  registrationClosesAt: nullableDate,
  contestDate: nullableDate,
  resultsDate: nullableDate,
  messages: messagesSchema,
  banner: bannerSchema,
  countdown: countdownSchema,
  buttons: buttonsSchema,
  info: infoSchema,
  seo: seoSchema,
  stats: statsSchema,
  whatsappLinks: whatsappLinksSchema,
});

export type ContestSettingsInput = z.input<typeof contestSettingsSchema>;

/**
 * Message d'erreur lisible pour l'admin à partir d'un échec de validation
 * (voir lib/actions/contest-settings.ts) : jusqu'ici un seul message figé
 * ("Données invalides. Vérifiez les champs.") remontait quel que soit le
 * champ en cause, sans dire lequel ni pourquoi — ex. un titre SEO de 85
 * caractères contre une limite de 70. Pour les dépassements de longueur (le
 * cas le plus fréquent), on affiche la longueur atteinte et la limite ;
 * sinon on retombe sur le message Zod brut. Plafonné à 3 problèmes pour
 * rester lisible dans un toast.
 */
export function describeValidationError(error: z.ZodError, input: unknown): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => {
      const path = issue.path.join(".");
      if (issue.code === "too_big" || issue.code === "too_small") {
        const value = issue.path.reduce<unknown>(
          (acc, key) =>
            acc && typeof acc === "object"
              ? (acc as Record<string, unknown>)[key as string]
              : undefined,
          input
        );
        const limit =
          "maximum" in issue
            ? issue.maximum
            : "minimum" in issue
              ? issue.minimum
              : undefined;
        if (typeof value === "string" && typeof limit === "number") {
          return `${path} : ${value.length}/${limit} caractères`;
        }
      }
      return `${path} : ${issue.message}`;
    })
    .join(" — ");
}
