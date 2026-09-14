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
  filiere: z.string().min(1).optional(),
  dateNaissance: z.string().min(1).optional(),
});

export const resultatDepartementSchema = z
  .object({
    admis: z.array(candidatSchema),
  })
  .refine(
    (data) => {
      const candidats = data.admis.map((c) => `${c.nom}:${c.dateNaissance ?? ""}`);
      return new Set(candidats).size === candidats.length;
    },
    { message: "Des candidats sont dupliqués.", path: ["admis"] }
  );

export type ResultatDepartementInput = z.infer<typeof resultatDepartementSchema>;
