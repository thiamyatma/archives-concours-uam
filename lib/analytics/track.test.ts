import { describe, expect, it, vi } from "vitest";
import { ANALYTICS_EVENTS } from "./events";
import { trackContact, trackEvent, trackViewSubject } from "./track";

describe("trackEvent (no gtag loaded)", () => {
  it("is a safe no-op when window/gtag is absent (node env)", () => {
    // Environnement node : pas de `window.gtag`. trackEvent ne doit ni jeter
    // ni retourner de valeur — c'est ce qui rend son appel sûr partout
    // (dev, consentement refusé, ID absent).
    expect(() =>
      trackEvent(ANALYTICS_EVENTS.VIEW_SUBJECT, { department: "dsti" })
    ).not.toThrow();
    expect(trackViewSubject({ year: 2025 })).toBeUndefined();
    expect(trackContact()).toBeUndefined();
  });
});

describe("trackEvent (gtag present)", () => {
  it("forwards the event name and params to window.gtag", () => {
    const gtag = vi.fn();
    vi.stubGlobal("window", { gtag });

    try {
      trackViewSubject({ department: "dgae", year: 2025 });
      expect(gtag).toHaveBeenCalledWith("event", "view_subject", {
        department: "dgae",
        year: 2025,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
