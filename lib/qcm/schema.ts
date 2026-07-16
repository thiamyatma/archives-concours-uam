import { z } from "zod";

/**
 * Validation des fichiers `content/qcm/**\/*.json` (voir lib/qcm/types.ts).
 * Sert de garde-fou au chargement (lib/qcm/data.ts) et dans les tests : ces
 * fichiers sont écrits/édités à la main, une faute de frappe sur une lettre
 * de réponse ou un numéro dupliqué doit être détectée avant d'atteindre un
 * candidat.
 */

const lettre = z.enum(["A", "B", "C", "D"]);

const propositionsSchema = z.object({
  A: z.string().min(1),
  B: z.string().min(1),
  C: z.string().min(1),
  D: z.string().min(1),
});

const questionSchema = z.object({
  numero: z.number().int().positive(),
  question: z.string().min(1),
  propositions: propositionsSchema,
  bonne_reponse: lettre,
  reponse_candidat: z.null(),
  resultat: z.null(),
  justification: z.string().min(1),
  concept: z.string().min(1),
  difficulte: z.enum(["Facile", "Moyenne", "Difficile"]),
});

const resumeSchema = z.object({
  score: z.null(),
  pourcentage: z.null(),
  niveau: z.null(),
  commentaire: z.null(),
  chapitres_a_revoir: z.null(),
});

export const qcmMatiereSchema = z
  .object({
    matiere: z.string().min(1),
    nombre_questions: z.number().int().positive(),
    questions: z.array(questionSchema),
    resume: resumeSchema,
  })
  .refine((data) => data.questions.length === data.nombre_questions, {
    message: "nombre_questions ne correspond pas à la taille de questions[].",
    path: ["nombre_questions"],
  })
  .refine(
    (data) => new Set(data.questions.map((q) => q.numero)).size === data.questions.length,
    { message: "Des numéros de question sont dupliqués.", path: ["questions"] }
  );

export type QcmMatiereInput = z.infer<typeof qcmMatiereSchema>;
