import { describe, expect, it } from "vitest";
import { DEFAULT_CONTEST_SETTINGS } from "@/config/contest";
import type { ContestSettings } from "@/lib/contest/types";
import { diffContestSettings } from "./history-diff";

function makeSettings(overrides: Partial<ContestSettings> = {}): ContestSettings {
  return { ...DEFAULT_CONTEST_SETTINGS, ...overrides };
}

describe("diffContestSettings", () => {
  it("ne renvoie rien si rien n'a changé", () => {
    const s = makeSettings();
    expect(diffContestSettings(s, s)).toEqual([]);
  });

  it("détecte un champ scalaire modifié", () => {
    const before = makeSettings({ year: 2026 });
    const after = makeSettings({ year: 2027 });
    const changes = diffContestSettings(before, after);
    expect(changes).toContainEqual({
      fieldPath: "year",
      oldValue: "2026",
      newValue: "2027",
    });
  });

  it("détecte un champ imbriqué modifié (dot-path)", () => {
    const before = makeSettings();
    const after = makeSettings({
      messages: { ...before.messages, duringRegistration: "Nouveau message" },
    });
    const changes = diffContestSettings(before, after);
    expect(changes).toEqual([
      {
        fieldPath: "messages.duringRegistration",
        oldValue: before.messages.duringRegistration,
        newValue: "Nouveau message",
      },
    ]);
  });

  it("détecte une date modifiée", () => {
    const before = makeSettings({ contestDate: new Date("2026-08-22T08:00:00Z") });
    const after = makeSettings({ contestDate: new Date("2026-08-23T08:00:00Z") });
    const changes = diffContestSettings(before, after);
    expect(changes).toEqual([
      {
        fieldPath: "contestDate",
        oldValue: "2026-08-22T08:00:00.000Z",
        newValue: "2026-08-23T08:00:00.000Z",
      },
    ]);
  });

  it("détecte un booléen modifié", () => {
    const before = makeSettings();
    const after = makeSettings({
      countdown: { ...before.countdown, showSeconds: false },
    });
    const changes = diffContestSettings(before, after);
    expect(changes).toContainEqual({
      fieldPath: "countdown.showSeconds",
      oldValue: "true",
      newValue: "false",
    });
  });

  it("ignore null vs null (pas de faux positif)", () => {
    const before = makeSettings({ resultsDate: null });
    const after = makeSettings({ resultsDate: null });
    expect(diffContestSettings(before, after)).toEqual([]);
  });
});
