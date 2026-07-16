import { describe, expect, it } from "vitest";
import { contestSettingsSchema } from "./schema";

const validInput = {
  year: 2026,
  officialName: "Concours d'entrée 2026",
  subtitle: "",
  description: "",
  registrationOpensAt: "2026-07-23T00:00:00.000Z",
  registrationClosesAt: "2026-08-16T23:59:59.000Z",
  contestDate: "2026-08-22T08:00:00.000Z",
  resultsDate: null,
  messages: {
    beforeRegistration: "a",
    duringRegistration: "b",
    afterRegistration: "c",
    contestDay: "d",
    afterContest: "e",
    beforeResults: "f",
    afterResults: "g",
  },
  banner: { enabled: false, title: "", message: "", type: "info", color: "" },
  countdown: {
    enabled: true,
    floatingWidget: false,
    position: "right",
    showSeconds: true,
    showProgress: false,
  },
  buttons: {
    primaryLabel: "Voir",
    primaryUrl: "/departements",
    secondaryLabel: "Déposer",
    secondaryUrl: "https://depot.uam.sn/concours",
  },
  info: {
    location: "",
    convocationTime: "",
    startTime: "",
    documents: "",
    allowedMaterial: "",
    instructions: "",
    officialUrl: "",
  },
  seo: { title: "", description: "", ogImageUrl: "", keywords: "" },
  stats: { showExams: true, showDownloads: true, showViews: true },
};

describe("contestSettingsSchema", () => {
  it("accepte une entrée valide et transforme les dates en Date", () => {
    const parsed = contestSettingsSchema.parse(validInput);
    expect(parsed.contestDate).toBeInstanceOf(Date);
    expect(parsed.resultsDate).toBeNull();
  });

  it("rejette un nom officiel vide", () => {
    expect(
      contestSettingsSchema.safeParse({ ...validInput, officialName: "" }).success
    ).toBe(false);
  });

  it("rejette un type de bannière inconnu", () => {
    expect(
      contestSettingsSchema.safeParse({
        ...validInput,
        banner: { ...validInput.banner, type: "purple" },
      }).success
    ).toBe(false);
  });

  it("rejette une couleur non hexadécimale", () => {
    expect(
      contestSettingsSchema.safeParse({
        ...validInput,
        banner: { ...validInput.banner, color: "rouge" },
      }).success
    ).toBe(false);
  });

  it("accepte une couleur vide (= couleur du type)", () => {
    expect(
      contestSettingsSchema.safeParse({
        ...validInput,
        banner: { ...validInput.banner, color: "" },
      }).success
    ).toBe(true);
  });

  it("rejette une date invalide", () => {
    expect(
      contestSettingsSchema.safeParse({ ...validInput, contestDate: "pas-une-date" })
        .success
    ).toBe(false);
  });
});
