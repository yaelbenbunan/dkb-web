"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CONSENT_CHANGED_EVENT,
  type ConsentState,
  readConsent,
} from "@/lib/cookies-consent";
import { CHATGPT_PIXEL_ID, trackChatGptPageView } from "@/lib/chatgpt-pixel";

/**
 * Píxel de medición de OpenAI, para atribuir las visitas que llegan desde los
 * anuncios de ChatGPT.
 *
 * Es un píxel publicitario de un tercero, así que no se carga hasta que la
 * persona acepta las cookies de marketing: mientras no lo haga, este componente
 * no renderiza nada y el script ni siquiera se descarga. Al aceptar en el
 * banner entra solo, sin recargar la página, porque el consentimiento avisa por
 * `CONSENT_CHANGED_EVENT`.
 *
 * OpenAI recomienda ponerlo en el <head>, pero decidir el consentimiento exige
 * mirar el navegador; el script es `async`, así que la diferencia es de
 * milisegundos.
 */
export function ChatGPTPixel() {
  const [marketingAllowed, setMarketingAllowed] = useState(false);
  const pathname = usePathname();
  // La primera vista ya la cuenta el `init` del SDK: aquí solo se miden los
  // cambios de ruta, que en Next no recargan la página.
  const firstPathSeen = useRef<string | null>(null);

  useEffect(() => {
    const apply = (state: ConsentState | null) => {
      setMarketingAllowed(Boolean(state?.marketing));
    };
    apply(readConsent());

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentState>).detail;
      apply(detail ?? null);
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!marketingAllowed || !pathname) return;
    if (firstPathSeen.current === null) {
      firstPathSeen.current = pathname;
      return;
    }
    if (firstPathSeen.current === pathname) return;
    firstPathSeen.current = pathname;
    trackChatGptPageView(pathname);
  }, [marketingAllowed, pathname]);

  if (!marketingAllowed || !CHATGPT_PIXEL_ID) return null;

  return (
    <Script id="chatgpt-pixel" strategy="afterInteractive">
      {`!function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");oaiq("init",{pixelId:${JSON.stringify(
        CHATGPT_PIXEL_ID,
      )},debug:${process.env.NODE_ENV !== "production"}});`}
    </Script>
  );
}
