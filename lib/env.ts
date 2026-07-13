import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: "NEXT_PUBLIC_SUPABASE_URL doit être une URL Supabase valide",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY manquant"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY manquant")
    .optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional().default("http://localhost:3000"),
  RESEND_API_KEY: z.string().min(1).optional(),
  ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),

  // Assistant IA (RAG polytech.sn) — voir docs/RAG.md
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY manquant").optional(),
  GROQ_MODEL: z.string().min(1).optional().default("llama-3.3-70b-versatile"),
  RAG_MAX_QUESTIONS_PER_IP_PER_DAY: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(30),
});

/** Une variable optionnelle laissée vide (`FOO=`) doit être traitée comme absente. */
function orUndefined(value: string | undefined) {
  return value === "" ? undefined : value;
}

function loadEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: orUndefined(process.env.SUPABASE_SERVICE_ROLE_KEY),
    NEXT_PUBLIC_SITE_URL: orUndefined(process.env.NEXT_PUBLIC_SITE_URL),
    RESEND_API_KEY: orUndefined(process.env.RESEND_API_KEY),
    ADMIN_NOTIFICATION_EMAIL: orUndefined(process.env.ADMIN_NOTIFICATION_EMAIL),
    GROQ_API_KEY: orUndefined(process.env.GROQ_API_KEY),
    GROQ_MODEL: orUndefined(process.env.GROQ_MODEL),
    RAG_MAX_QUESTIONS_PER_IP_PER_DAY: orUndefined(
      process.env.RAG_MAX_QUESTIONS_PER_IP_PER_DAY
    ),
  });

  if (!parsed.success) {
    console.error(
      "Variables d'environnement invalides:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error(
      "Configuration Supabase invalide. Vérifiez votre fichier .env.local (voir .env.example)."
    );
  }

  return parsed.data;
}

export const env = loadEnv();
