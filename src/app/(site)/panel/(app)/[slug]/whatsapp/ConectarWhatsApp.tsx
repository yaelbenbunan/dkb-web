"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { leerEventoRegistro } from "@/lib/whatsapp/registro";
import { GRAPH_VERSION } from "@/lib/whatsapp/version";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonPrimario } from "../../../_componentes/estilos";
import { conectarWhatsAppAction } from "./acciones";

const APP_ID = "1444585017092524";
const CONFIG_ID = "971972375349049";
/** Lo que se espera el aviso con la WABA después de tener el code (llegan por canales distintos). */
const ESPERA_SESION_MS = 5000;

const NO_COMPLETADA: ResultadoAccion = { ok: false, error: "La conexión no se completó. Puedes volver a intentarlo." };

interface RespuestaLogin {
  authResponse?: { code?: string } | null;
}
interface SdkFacebook {
  init(opciones: Record<string, unknown>): void;
  login(callback: (r: RespuestaLogin) => void, opciones: Record<string, unknown>): void;
}
declare global {
  interface Window {
    FB?: SdkFacebook;
  }
}

/**
 * Botón que abre Embedded Signup de Meta en coexistencia. Meta devuelve dos
 * cosas por caminos distintos: el `code` en la respuesta de FB.login y la
 * WABA/número por postMessage. Solo con las dos se llama al servidor.
 */
export function ConectarWhatsApp({ slug, texto }: { slug: string; texto: string }) {
  const [listo, setListo] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  const [enviando, empezar] = useTransition();
  const code = useRef<string | null>(null);
  const sesion = useRef<{ wabaId: string; numeroId: string | null } | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reiniciar = useCallback(() => {
    code.current = null;
    sesion.current = null;
    if (espera.current) clearTimeout(espera.current);
    espera.current = null;
  }, []);

  const intentar = useCallback(() => {
    if (!code.current) return;
    if (!sesion.current) {
      // El code llegó antes que el aviso: se le da un margen y, si no llega, se avisa.
      if (!espera.current) {
        espera.current = setTimeout(() => {
          reiniciar();
          setResultado({ ok: false, error: "Meta no ha devuelto la cuenta de WhatsApp. Vuelve a intentarlo." });
        }, ESPERA_SESION_MS);
      }
      return;
    }
    const datos = { code: code.current, ...sesion.current };
    reiniciar();
    empezar(async () => setResultado(await conectarWhatsAppAction(slug, datos)));
  }, [slug, reiniciar]);

  useEffect(() => {
    function alMensaje(e: MessageEvent) {
      const evento = leerEventoRegistro({ origin: e.origin, data: e.data });
      if (!evento) return;
      if (evento === "cancelado") {
        reiniciar();
        setResultado(NO_COMPLETADA);
        return;
      }
      sesion.current = evento;
      intentar();
    }
    window.addEventListener("message", alMensaje);
    return () => {
      window.removeEventListener("message", alMensaje);
      reiniciar();
    };
  }, [intentar, reiniciar]);

  function abrir() {
    if (!window.FB) return;
    reiniciar();
    setResultado(null);
    // El callback de FB.login no puede ser async: el SDK lo rechaza.
    window.FB.login(
      (r) => {
        const recibido = r.authResponse?.code;
        if (!recibido) {
          reiniciar();
          setResultado(NO_COMPLETADA);
          return;
        }
        code.current = recibido;
        intentar();
      },
      {
        config_id: CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, sessionInfoVersion: "3", version: "v4", featureType: "whatsapp_business_app_onboarding" },
      },
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
      <Script
        src="https://connect.facebook.net/es_ES/sdk.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
        // onReady (no onLoad): también se ejecuta al volver a la página con el SDK ya cargado.
        onReady={() => {
          window.FB?.init({ appId: APP_ID, autoLogAppEvents: true, xfbml: true, version: GRAPH_VERSION });
          setListo(Boolean(window.FB));
        }}
      />
      <button type="button" onClick={abrir} disabled={!listo || enviando} style={{ ...botonPrimario, opacity: !listo || enviando ? 0.6 : 1 }}>
        {enviando ? "Conectando…" : texto}
      </button>
      <Mensaje resultado={resultado} />
    </div>
  );
}
