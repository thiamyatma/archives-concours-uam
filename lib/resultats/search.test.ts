import { describe, expect, it } from "vitest";
import { normalizeSearchText, searchCandidats } from "@/lib/resultats/search";

describe("normalizeSearchText", () => {
  it("retire les accents et met en minuscules", () => {
    expect(normalizeSearchText("DIOP Fatou Awa")).toBe("diop fatou awa");
    expect(normalizeSearchText("Ndèye Aïssatou Sarr")).toBe("ndeye aissatou sarr");
  });

  it("retire les espaces superflus en début/fin", () => {
    expect(normalizeSearchText("  Sarr  ")).toBe("sarr");
  });
});

describe("searchCandidats", () => {
  const candidats = [
    { departementCode: "dsti", nom: "DIOP Fatou Awa", numero: "24-00123" },
    { departementCode: "dgo", nom: "SARR Moussa" },
    { departementCode: "dgae", nom: "Ndèye Aïssatou Sarr", numero: "24-00456" },
  ];

  it("renvoie un tableau vide pour une requête vide", () => {
    expect(searchCandidats(candidats, "")).toEqual([]);
    expect(searchCandidats(candidats, "   ")).toEqual([]);
  });

  it("trouve par nom, insensible à la casse et aux accents", () => {
    expect(searchCandidats(candidats, "sarr")).toHaveLength(2);
    expect(searchCandidats(candidats, "aissatou")).toEqual([candidats[2]]);
  });

  it("trouve par numéro de candidat", () => {
    expect(searchCandidats(candidats, "24-00123")).toEqual([candidats[0]]);
  });

  it("ne plante pas sur un candidat sans numéro", () => {
    expect(searchCandidats(candidats, "moussa")).toEqual([candidats[1]]);
  });

  it("ne renvoie rien pour une requête sans correspondance", () => {
    expect(searchCandidats(candidats, "introuvable")).toEqual([]);
  });
});
