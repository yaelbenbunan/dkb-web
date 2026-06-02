import { describe, it, expect, beforeEach, vi } from "vitest";

interface DLWindow extends Window {
  dataLayer?: unknown[];
}

declare const window: DLWindow;

async function importFresh() {
  vi.resetModules();
  return import("@/lib/gtm");
}

describe("gtm helpers (disabled — no NEXT_PUBLIC_GTM_ID)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "");
    window.dataLayer = [];
  });

  it("isEnabled returns false when env is empty", async () => {
    const { isEnabled } = await importFresh();
    expect(isEnabled()).toBe(false);
  });

  it("track is a no-op when disabled", async () => {
    const { track } = await importFresh();
    expect(() => track("generate_lead", { form_location: "hero_home" })).not.toThrow();
    expect(window.dataLayer).toEqual([]);
  });

  it("setConsent is a no-op when disabled", async () => {
    const { setConsent } = await importFresh();
    expect(() => setConsent(null)).not.toThrow();
    expect(window.dataLayer).toEqual([]);
  });
});

describe("gtm helpers (enabled)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-TESTID");
    window.dataLayer = [];
  });

  it("isEnabled returns true when env is set", async () => {
    const { isEnabled } = await importFresh();
    expect(isEnabled()).toBe(true);
  });

  it("track pushes an event with params to dataLayer", async () => {
    const { track } = await importFresh();
    track("generate_lead", { form_location: "hero_home", service: "Web" });
    expect(window.dataLayer).toEqual([
      { event: "generate_lead", form_location: "hero_home", service: "Web" },
    ]);
  });

  it("track works with no params", async () => {
    const { track } = await importFresh();
    track("phone_call");
    expect(window.dataLayer).toEqual([{ event: "phone_call" }]);
  });

  it("setConsent(null) pushes consent update with everything denied", async () => {
    const { setConsent } = await importFresh();
    setConsent(null);
    expect(window.dataLayer).toEqual([
      [
        "consent",
        "update",
        {
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
          analytics_storage: "denied",
        },
      ],
    ]);
  });

  it("setConsent maps analytics:true marketing:false correctly", async () => {
    const { setConsent } = await importFresh();
    setConsent({
      necessary: true,
      analytics: true,
      marketing: false,
      updatedAt: "2026-05-11T00:00:00.000Z",
      version: 1,
    });
    expect(window.dataLayer).toEqual([
      [
        "consent",
        "update",
        {
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
          analytics_storage: "granted",
        },
      ],
    ]);
  });

  it("normalizePhoneE164 formats Spanish numbers", async () => {
    const { normalizePhoneE164 } = await importFresh();
    expect(normalizePhoneE164("600 123 456")).toBe("+34600123456");
    expect(normalizePhoneE164("+34 600-123-456")).toBe("+34600123456");
    expect(normalizePhoneE164("0034600123456")).toBe("+34600123456");
    expect(normalizePhoneE164("+1 (415) 555-2671")).toBe("+14155552671");
    expect(normalizePhoneE164("  ")).toBe("");
  });

  it("pushUserData pushes normalized email + tel", async () => {
    const { pushUserData } = await importFresh();
    pushUserData({ email: "  Hola@Dinkbit.ES ", phone: "600 123 456" });
    expect(window.dataLayer).toEqual([
      { email: "hola@dinkbit.es", tel: "+34600123456" },
    ]);
  });

  it("pushUserData omits missing fields and no-ops when empty", async () => {
    const { pushUserData } = await importFresh();
    pushUserData({ phone: "600123456" });
    pushUserData({ email: "", phone: "" });
    expect(window.dataLayer).toEqual([{ tel: "+34600123456" }]);
  });

  it("setConsent maps both granted correctly", async () => {
    const { setConsent } = await importFresh();
    setConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      updatedAt: "2026-05-11T00:00:00.000Z",
      version: 1,
    });
    expect(window.dataLayer).toEqual([
      [
        "consent",
        "update",
        {
          ad_storage: "granted",
          ad_user_data: "granted",
          ad_personalization: "granted",
          analytics_storage: "granted",
        },
      ],
    ]);
  });
});
