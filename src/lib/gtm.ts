import type { ConsentState } from "@/lib/cookies-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export const GTM_ID: string | undefined = process.env.NEXT_PUBLIC_GTM_ID;

export function isEnabled(): boolean {
  return typeof window !== "undefined" && !!GTM_ID;
}

export function dataLayerPush(payload: unknown): void {
  if (!isEnabled()) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

export function track(name: string, params?: Record<string, unknown>): void {
  if (!isEnabled()) return;
  dataLayerPush({ event: name, ...(params ?? {}) });
}

/** Normalize a (mostly Spanish) phone number to E.164 — the format Google
 *  Enhanced Conversions expects. Falls back to a +34 prefix when no country
 *  code is present. Returns "" when there are no digits to work with. */
export function normalizePhoneE164(raw: string): string {
  let s = raw.trim().replace(/[\s().\-/]/g, "");
  if (!s) return "";
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (s.startsWith("+")) return `+${s.slice(1).replace(/\D/g, "")}`;
  const d = s.replace(/\D/g, "");
  if (!d) return "";
  return d.startsWith("34") && d.length > 9 ? `+${d}` : `+34${d}`;
}

/** Push first-party identifiers (email / phone) to the dataLayer so Google's
 *  Enhanced Conversions can pick them up. Google's tag hashes them (SHA-256)
 *  on the client before sending, and only transmits when `ad_user_data`
 *  consent is granted — so this is safe to call on every successful submit.
 *  Keys (`email`, `tel`) match the "user-provided data" variables in GTM. */
export function pushUserData(data: {
  email?: string | null;
  phone?: string | null;
}): void {
  if (!isEnabled()) return;
  const payload: Record<string, string> = {};
  const email = data.email?.trim().toLowerCase();
  if (email) payload.email = email;
  const tel = data.phone ? normalizePhoneE164(data.phone) : "";
  if (tel) payload.tel = tel;
  if (Object.keys(payload).length === 0) return;
  dataLayerPush(payload);
}

type ConsentValue = "granted" | "denied";
interface GoogleConsentPayload {
  ad_storage: ConsentValue;
  ad_user_data: ConsentValue;
  ad_personalization: ConsentValue;
  analytics_storage: ConsentValue;
}

function toGoogleConsent(state: ConsentState | null): GoogleConsentPayload {
  const analytics = state?.analytics ? "granted" : "denied";
  const marketing = state?.marketing ? "granted" : "denied";
  return {
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
    analytics_storage: analytics,
  };
}

export function setConsent(state: ConsentState | null): void {
  if (!isEnabled()) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(["consent", "update", toGoogleConsent(state)]);
}
