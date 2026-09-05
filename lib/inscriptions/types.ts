/**
 * Types du domaine "inscriptions au concours" (voir docs/verification-admis.md) :
 * base de contrôle admin-only (email + nom) utilisée uniquement pour
 * vérifier qu'un candidat qui se déclare admis figure bien sur la liste
 * fournie par le département — jamais exposée publiquement.
 */

export interface InscriptionsSummary {
  departementCode: string;
  count: number;
}
