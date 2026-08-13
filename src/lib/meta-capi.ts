import "server-only";
import { createHash } from "node:crypto";

/**
 * Envío de conversiones a Meta desde el servidor (API de Conversiones).
 *
 * Existe porque el píxel del navegador pierde entre un 20% y un 40% de los
 * eventos: bloqueadores, iOS y quien rechaza cookies. En un nicho de poco
 * volumen eso significa que el algoritmo tarda el doble en aprender, o no
 * aprende. El servidor ve el 100% de los envíos.
 *
 * Ambos caminos mandan el MISMO `eventId`, que es lo que hace que Meta los
 * reconozca como el mismo evento y no cuente dos conversiones por lead.
 *
 * Best-effort de principio a fin: si falta el token o la llamada falla, se
 * registra y se sigue. El lead ya está guardado y perderlo por un fallo de
 * medición sería absurdo.
 */

const PIXEL_ID = process.env.META_PIXEL_ID ?? "330504617974775";
const API_VERSION = "v21.0";

/** Meta exige SHA-256 sobre el valor normalizado: minúsculas y sin espacios. */
function hash(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/**
 * Teléfono en el formato que espera Meta: solo dígitos, con prefijo de país y
 * sin el "+". Un número español sin prefijo no casa con nadie, así que se le
 * antepone el 34 cuando viene con los nueve dígitos pelados.
 */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 9) return `34${digits}`;
  return digits;
}

export interface MetaLeadEvent {
  /** El mismo que usa el píxel del navegador. Sin él, Meta cuenta doble. */
  eventId: string;
  email?: string | null;
  phone?: string | null;
  /** URL donde ocurrió la conversión. */
  sourceUrl?: string | null;
  userAgent?: string | null;
  clientIp?: string | null;
  /** Cookies del píxel: mejoran mucho la tasa de emparejamiento. */
  fbp?: string | null;
  fbc?: string | null;
}

export async function sendMetaLead(event: MetaLeadEvent): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) {
    // No es un error: mientras no exista el token, el píxel del navegador
    // sigue midiendo por su cuenta.
    return { ok: false, error: "capi_token_missing" };
  }

  const userData: Record<string, string[] | string> = {};
  if (event.email) userData.em = [hash(event.email)];
  const phone = event.phone ? normalizePhone(event.phone) : null;
  if (phone) userData.ph = [hash(phone)];
  if (event.fbp) userData.fbp = event.fbp;
  if (event.fbc) userData.fbc = event.fbc;
  if (event.userAgent) userData.client_user_agent = event.userAgent;
  if (event.clientIp) userData.client_ip_address = event.clientIp;

  const body = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        event_source_url: event.sourceUrl ?? undefined,
        action_source: "website",
        user_data: userData,
      },
    ],
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const detalle = await res.text();
      console.error("[meta-capi] respuesta no OK:", res.status, detalle.slice(0, 300));
      return { ok: false, error: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[meta-capi] la llamada falló:", err);
    return { ok: false, error: "request_failed" };
  }
}
