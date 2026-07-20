import { describe, expect, it } from "vitest";
import { contestSettingsSchema, describeValidationError } from "./schema";

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
  partner: {
    enabled: true,
    registrationUrl: "https://example.com/pay",
    phoneDisplay: "+221 00 000 00 00",
    phoneHref: "tel:+22100000000",
  },
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

describe("describeValidationError", () => {
  it("indique le champ et la longueur atteinte pour un dépassement de longueur", () => {
    const input = { ...validInput, seo: { ...validInput.seo, title: "x".repeat(85) } };
    const result = contestSettingsSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");

    expect(describeValidationError(result.error, input)).toBe(
      "seo.title : 85/70 caractères"
    );
  });

  it("retombe sur le message Zod brut pour une erreur qui n'est pas une longueur", () => {
    const input = { ...validInput, banner: { ...validInput.banner, type: "purple" } };
    const result = contestSettingsSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");

    expect(describeValidationError(result.error, input)).toContain("banner.type");
  });

  it("plafonne à 3 problèmes rapportés", () => {
    const input = {
      ...validInput,
      officialName: "",
      seo: { ...validInput.seo, title: "x".repeat(85), keywords: "y".repeat(400) },
      banner: { ...validInput.banner, type: "purple" },
    };
    const result = contestSettingsSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");

    expect(describeValidationError(result.error, input).split(" — ")).toHaveLength(3);
  });
});
