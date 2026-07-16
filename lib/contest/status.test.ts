import { describe, expect, it } from "vitest";
import type { ContestConfig } from "@/config/contest";
import { getContestPhase, getRemainingTime } from "./status";

const config: ContestConfig = {
  year: 2026,
  registrationDeadline: new Date("2026-08-16T23:59:59"),
  contestDate: new Date("2026-08-22T08:00:00"),
  resultsMessage: "Les résultats seront publiés prochainement.",
  registrationUrl: "https://depot.uam.sn/concours",
};

describe("getContestPhase", () => {
  it("renvoie 'registration' bien avant la date limite", () => {
    expect(getContestPhase(new Date("2026-07-01T10:00:00"), config)).toBe("registration");
  });

  it("renvoie 'registration' jusqu'à la date limite incluse", () => {
    expect(getContestPhase(new Date("2026-08-16T23:59:59"), config)).toBe("registration");
  });

  it("renvoie 'closed' juste après la date limite", () => {
    expect(getContestPhase(new Date("2026-08-17T00:00:00"), config)).toBe("closed");
  });

  it("renvoie 'closed' pendant la période inter-inscriptions/concours", () => {
    expect(getContestPhase(new Date("2026-08-21T23:59:59"), config)).toBe("closed");
  });

  it("renvoie 'contest-day' dès le début du jour du concours", () => {
    expect(getContestPhase(new Date("2026-08-22T00:00:00"), config)).toBe("contest-day");
  });

  it("renvoie 'contest-day' à l'heure du concours", () => {
    expect(getContestPhase(new Date("2026-08-22T08:00:00"), config)).toBe("contest-day");
  });

  it("renvoie 'contest-day' jusqu'à la fin du jour du concours", () => {
    expect(getContestPhase(new Date("2026-08-22T23:59:59"), config)).toBe("contest-day");
  });

  it("renvoie 'finished' le lendemain du concours", () => {
    expect(getContestPhase(new Date("2026-08-23T00:00:00"), config)).toBe("finished");
  });
});

describe("getRemainingTime", () => {
  it("décompose correctement un écart de plusieurs jours", () => {
    const now = new Date("2026-08-20T08:00:00");
    const target = new Date("2026-08-22T08:00:00");
    expect(getRemainingTime(now, target)).toEqual({
      days: 2,
      hours: 0,
      minutes: 0,
      seconds: 0,
      total: 2 * 86400 * 1000,
    });
  });

  it("décompose heures, minutes et secondes", () => {
    const now = new Date("2026-08-21T20:30:15");
    const target = new Date("2026-08-22T08:00:00");
    expect(getRemainingTime(now, target)).toMatchObject({
      days: 0,
      hours: 11,
      minutes: 29,
      seconds: 45,
    });
  });

  it("ne renvoie jamais de valeurs négatives une fois la cible dépassée", () => {
    const now = new Date("2026-08-23T00:00:00");
    const target = new Date("2026-08-22T08:00:00");
    expect(getRemainingTime(now, target)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      total: 0,
    });
  });
});
