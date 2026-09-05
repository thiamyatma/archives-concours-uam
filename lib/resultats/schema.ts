import { z } from "zod";

/**
 * Validation d'un fichier `content/resultats/<année>/<département>.json`
 * (voir lib/resultats/data.ts). Le département et l'année viennent du
 * chemin du fichier (dossier = année, nom de fichier = code département) —
 * même convention que content/archives/** et content/qcm/** — donc le JSON
 * ne contient que la liste des admis.
 */
const candidatSchema = z.object({
  nom: z.string().min(1),
  numero: z.string().min(1).optional(),
});

export const resultatDepartementSchema = z
  .object({
    admis: z.array(candidatSchema),
  })
  .refine(
    (data) => {
      const numeros = data.admis
        .map((c) => c.numero)
        .filter((n): n is string => n !== undefined);
      return new Set(numeros).size === numeros.length;
    },
    { message: "Des numéros de candidat sont dupliqués.", path: ["admis"] }
  );

export type ResultatDepartementInput = z.infer<typeof resultatDepartementSchema>;
