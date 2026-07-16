import { describe, expect, it } from "vitest";
import { DEFAULT_CONTEST_SETTINGS } from "@/config/contest";
import type { ContestSettings } from "@/lib/contest/types";
import {
  getContestPhase,
  getContestProgress,
  getRemainingTime,
  phaseHasCountdown,
} from "./status";

function makeSettings(overrides: Partial<ContestSettings> = {}): ContestSettings {
  return {
    ...DEFAULT_CONTEST_SETTINGS,
    registrationOpensAt: new Date("2026-07-23T00:00:00Z"),
    registrationClosesAt: new Date("2026-08-16T23:59:59Z"),
    contestDate: new Date("2026-08-22T08:00:00Z"),
    resultsDate: new Date("2026-09-05T12:00:00Z"),
    ...overrides,
  };
}

describe("getContestPhase", () => {
  const s = makeSettings();

  it("avant l'ouverture → before_registration", () => {
    expect(getContestPhase(new Date("2026-07-01T10:00:00Z"), s)).toBe(
      "before_registration"
    );
  });

  it("pendant les inscriptions → registration_open", () => {
    expect(getContestPhase(new Date("2026-08-01T10:00:00Z"), s)).toBe(
      "registration_open"
    );
  });

  it("à la clôture incluse → registration_open", () => {
    expect(getContestPhase(new Date("2026-08-16T23:59:59Z"), s)).toBe(
      "registration_open"
    );
  });

  it("après clôture, avant le jour J → registration_closed", () => {
    expect(getContestPhase(new Date("2026-08-19T10:00:00Z"), s)).toBe(
      "registration_closed"
    );
  });

  it("le jour du concours → contest_day", () => {
    expect(getContestPhase(new Date("2026-08-22T15:00:00Z"), s)).toBe("contest_day");
  });

  it("après le concours, avant résultats → after_contest", () => {
    expect(getContestPhase(new Date("2026-08-25T10:00:00Z"), s)).toBe("after_contest");
  });

  it("à partir des résultats → results_published", () => {
    expect(getContestPhase(new Date("2026-09-05T12:00:00Z"), s)).toBe(
      "results_published"
    );
  });

  it("sans date de résultats, reste after_contest indéfiniment", () => {
    const noResults = makeSettings({ resultsDate: null });
    expect(getContestPhase(new Date("2027-01-01T00:00:00Z"), noResults)).toBe(
      "after_contest"
    );
  });
});

describe("phaseHasCountdown", () => {
  it("actif avant le jour J, inactif ensuite", () => {
    expect(phaseHasCountdown("before_registration")).toBe(true);
    expect(phaseHasCountdown("registration_open")).toBe(true);
    expect(phaseHasCountdown("registration_closed")).toBe(true);
    expect(phaseHasCountdown("contest_day")).toBe(false);
    expect(phaseHasCountdown("after_contest")).toBe(false);
    expect(phaseHasCountdown("results_published")).toBe(false);
  });
});

describe("getRemainingTime", () => {
  it("décompose un écart de plusieurs jours", () => {
    expect(
      getRemainingTime(new Date("2026-08-20T08:00:00Z"), new Date("2026-08-22T08:00:00Z"))
    ).toEqual({ days: 2, hours: 0, minutes: 0, seconds: 0, total: 2 * 86400 * 1000 });
  });

  it("ne renvoie jamais de valeurs négatives", () => {
    expect(
      getRemainingTime(new Date("2026-08-23T00:00:00Z"), new Date("2026-08-22T08:00:00Z"))
    ).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
  });
});

describe("getContestProgress", () => {
  const s = makeSettings();

  it("0 à l'ouverture, 1 au concours, ~0.5 au milieu", () => {
    expect(getContestProgress(new Date("2026-07-23T00:00:00Z"), s)).toBe(0);
    expect(getContestProgress(new Date("2026-08-22T08:00:00Z"), s)).toBe(1);
    const mid = getContestProgress(new Date("2026-08-06T16:00:00Z"), s);
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.6);
  });

  it("null si dates manquantes", () => {
    expect(
      getContestProgress(new Date(), makeSettings({ contestDate: null }))
    ).toBeNull();
  });
});
