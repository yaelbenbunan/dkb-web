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
