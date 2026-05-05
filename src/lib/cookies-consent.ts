export type ConsentCategory = "necessary" | "analytics" | "marketing";

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  /** ISO date string. */
  updatedAt: string;
  /** Schema version to invalidate old consents on policy changes. */
  version: number;
}

export const CONSENT_VERSION = 1;
export const CONSENT_STORAGE_KEY = "dinkbit-cookie-consent";
/** Custom event used to open the consent banner from anywhere on the page. */
export const CONSENT_OPEN_EVENT = "dinkbit:cookie-settings:open";
/** Fired when consent state changes; payload is the new ConsentState. */
export const CONSENT_CHANGED_EVENT = "dinkbit:cookie-consent:changed";

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(
  partial: Pick<ConsentState, "analytics" | "marketing">,
): ConsentState {
  const next: ConsentState = {
    necessary: true,
    analytics: partial.analytics,
    marketing: partial.marketing,
    updatedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: next }));
  return next;
}

export function acceptAll() {
  return writeConsent({ analytics: true, marketing: true });
}

export function rejectAll() {
  return writeConsent({ analytics: false, marketing: false });
}
