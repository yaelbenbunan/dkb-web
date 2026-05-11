"use client";

import Script from "next/script";
import { useEffect } from "react";
import {
  CONSENT_CHANGED_EVENT,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  type ConsentState,
  readConsent,
} from "@/lib/cookies-consent";
import { GTM_ID, setConsent } from "@/lib/gtm";

export function GTM() {
  useEffect(() => {
    if (!GTM_ID) return;
    setConsent(readConsent());

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentState>).detail;
      setConsent(detail ?? null);
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
  }, []);

  if (!GTM_ID) return null;

  return (
    <>
      <Script id="gtm-consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
          (function(){
            var a='denied', m='denied';
            try {
              var raw = localStorage.getItem('${CONSENT_STORAGE_KEY}');
              if (raw) {
                var p = JSON.parse(raw);
                if (p && p.version === ${CONSENT_VERSION}) {
                  a = p.analytics ? 'granted' : 'denied';
                  m = p.marketing ? 'granted' : 'denied';
                }
              }
            } catch(e) {}
            window.gtag('consent', 'default', {
              ad_storage: m,
              ad_user_data: m,
              ad_personalization: m,
              analytics_storage: a,
              wait_for_update: 500,
            });
          })();
        `}
      </Script>
      <Script id="gtm-init" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `}
      </Script>
    </>
  );
}
