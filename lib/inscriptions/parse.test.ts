import { describe, expect, it } from "vitest";
import { parseInscriptionsInput } from "@/lib/inscriptions/parse";

describe("parseInscriptionsInput", () => {
  it("parse une ligne nom/date", () => {
    expect(parseInscriptionsInput("DIOP Fatou,18/02/2008")).toEqual({
      rows: [{ nom: "DIOP Fatou", dateNaissance: "18/02/2008" }],
      errors: [],
    });
  });

  it("parse le CSV complet avec département et filière", () => {
    expect(
      parseInscriptionsInput(
        "Département,Filière,Nom,Prénom,Date de naissance\nDGO,Management des Organisations,ADELAN,SARAH MAWOULI,21/02/2008"
      )
    ).toEqual({
      rows: [
        {
          departementCode: "DGO",
          filiere: "Management des Organisations",
          nom: "ADELAN SARAH MAWOULI",
          dateNaissance: "21/02/2008",
        },
      ],
      errors: [],
    });
  });

  it("accepte le point-virgule et la tabulation", () => {
    expect(
      parseInscriptionsInput("DIOP Fatou;18/02/2008\nSARR Moussa\t03/05/2007").rows
    ).toHaveLength(2);
  });

  it("signale une date invalide sans bloquer les autres lignes", () => {
    const result = parseInscriptionsInput(
      "DIOP Fatou,2008-02-18\nSARR Moussa,03/05/2007"
    );
    expect(result.rows).toEqual([{ nom: "SARR Moussa", dateNaissance: "03/05/2007" }]);
    expect(result.errors).toEqual([
      'Ligne 1 : date de naissance invalide ("2008-02-18").',
    ]);
  });

  it("signale une ligne sans nom", () => {
    expect(parseInscriptionsInput(",18/02/2008").errors).toEqual([
      "Ligne 1 : nom manquant.",
    ]);
  });

  it("signale une ligne incomplète", () => {
    expect(parseInscriptionsInput("DIOP Fatou").errors).toEqual([
      'Ligne 1 : format invalide (attendu "nom,date de naissance").',
    ]);
  });

  it("ignore les lignes vides et un en-tête", () => {
    const result = parseInscriptionsInput(
      "Département,Filière,Nom,Prénom,Date de naissance\n\nDGO,Management des Organisations,BA,ADAMA,25/09/2007"
    );
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toEqual([]);
  });
});
