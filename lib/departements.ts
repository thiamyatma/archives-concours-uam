/**
 * Config statique des départements : plus une table Supabase (voir
 * docs/ARCHITECTURE.md) car ces 5 entités changent rarement et le contenu
 * lui-même est désormais git-versionné (content/archives/**), pas en base.
 *
 * `contentGroup` désigne le dossier de contenu réellement lu par
 * lib/content/resolve.ts : DSTI, DGAE et DSTAAN partagent les mêmes
 * épreuves certaines années, donc pointent vers le même groupe. Un
 * département peut néanmoins avoir SA PROPRE épreuve pour une année donnée
 * (voir la résolution "override d'abord, partagé ensuite") sans qu'aucun
 * code ne change — il suffit de déposer un fichier dans son propre dossier.
 */
export interface Departement {
  code: string;
  nom: string;
  description: string;
  contentGroup: string;
}

export const DEPARTEMENTS: Departement[] = [
  {
    code: "dsti",
    nom: "DSTI",
    description:
      "Département Sciences et Techniques de l'Ingénieur — formation aux métiers de l'ingénierie et des technologies appliquées.",
    contentGroup: "dsti-dgae-dstaan",
  },
  {
    code: "dgae",
    nom: "DGAE",
    description:
      "Département Géosciences Appliquées et Environnement — sciences de la terre, ressources naturelles et environnement.",
    contentGroup: "dsti-dgae-dstaan",
  },
  {
    code: "dstaan",
    nom: "DSTAAN",
    description:
      "Département Sciences et Techniques Agricoles, Alimentaires et Nutritionnelles — agronomie, agroalimentaire et nutrition.",
    contentGroup: "dsti-dgae-dstaan",
  },
  {
    code: "du2adt",
    nom: "DU2ADT",
    description:
      "Département Urbanisme, Aménagement du Territoire et Développement Territorial.",
    contentGroup: "du2adt",
  },
  {
    code: "dgo",
    nom: "DGO",
    description:
      "Département Gouvernance et Organisations — sciences politiques, droit et gouvernance publique.",
    contentGroup: "dgo",
  },
];

export function getDepartementByCode(code: string): Departement | undefined {
  return DEPARTEMENTS.find((d) => d.code === code);
}
