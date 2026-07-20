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

const partnerSchema = z.object({
  enabled: z.boolean(),
  registrationUrl: z.string().max(500),
  phoneDisplay: z.string().max(50),
  phoneHref: z.string().max(50),
});

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
  partner: partnerSchema,
});

export type ContestSettingsInput = z.input<typeof contestSettingsSchema>;
