"use client";

import { useEffect, useState } from "react";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  CONSENT_CHANGED_EVENT,
  type ConsentState,
  readConsent,
} from "@/lib/cookies-consent";

export function Analytics() {
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  useEffect(() => {
    const apply = (state: ConsentState | null) => {
      setAnalyticsAllowed(Boolean(state?.analytics));
    };
    apply(readConsent());

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentState>).detail;
      apply(detail ?? null);
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
  }, []);

  if (!analyticsAllowed) return null;

  return (
    <>
      <VercelAnalytics />
      <SpeedInsights />
    </>
  );
}
