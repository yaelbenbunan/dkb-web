import "server-only";
import type { ResultadoAccion } from "../ventas/resultado";
import { cifrarToken, claveDeEntorno } from "./cifrado";
import { guardarConexion, setHistorialMarca } from "./numeros";
import { GRAPH_VERSION } from "./version";

// Conexión de un número de WhatsApp a una marca tras Embedded Signup en
// coexistencia: canje del code por un token de negocio, comprobación del
// número, guardado cifrado, suscripción a los webhooks y petición de
// sincronización de contactos e historial. En coexistencia NO se llama a
// /register ni se pone PIN: el número sigue vivo en la app del móvil.

const APP_ID = "1444585017092524";
const BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

type RespuestaGraph = { ok: true; datos: Record<string, unknown> } | { ok: false; error: string };

/** Quita de un texto cualquier secreto que Meta pudiera devolver repetido. */
function ocultar(texto: string, secretos: readonly string[]): string {
  return secretos.filter(Boolean).reduce((t, s) => t.split(s).join("***"), texto);
}

/** Una llamada a Graph con timeout; el error nunca lleva code, token ni secreto. */
async function graph(
  hacerFetch: typeof fetch,
  url: string,
  init: { method: "GET" | "POST"; token?: string; cuerpo?: unknown },
  secretos: readonly string[],
): Promise<RespuestaGraph> {
  const headers: Record<string, string> = {};
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  if (init.cuerpo !== undefined) headers["Content-Type"] = "application/json";
  try {
    const res = await hacerFetch(url, {
      method: init.method,
      headers,
      body: init.cuerpo === undefined ? undefined : JSON.stringify(init.cuerpo),
      signal: AbortSignal.timeout(8000),
    });
    const datos = ((await res.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
    if (!res.ok) {
      const meta = (datos.error ?? {}) as { message?: unknown };
      const mensaje = typeof meta.message === "string" ? meta.message : `HTTP ${res.status}`;
      return { ok: false, error: ocultar(mensaje, secretos) };
    }
    return { ok: true, datos };
  } catch (e) {
    return { ok: false, error: ocultar(e instanceof Error ? e.message : "error de red", secretos) };
  }
}

/** Fallo de un paso posterior al guardado: la conexión queda hecha y se dice qué faltó. */
function falloTrasGuardar(paso: string, error: string, marcaId: string): ResultadoAccion {
  console.error(`[whatsapp/conexion] ${paso} (marca ${marcaId}):`, error);
  return { ok: false, error: `El número quedó conectado, pero no se pudo ${paso}: ${error}. Vuelve a pulsar «Reconectar».` };
}

export async function conectarNumero(i: {
  marcaId: string;
  code: string;
  wabaId: string;
  numeroId: string | null;
  /** Estado del historial antes de conectar: solo se pide una vez por conexión. */
  historialActual?: "pedido" | "completo" | "rechazado" | null;
  fetchImpl?: typeof fetch;
}): Promise<ResultadoAccion> {
  // Todo lo que se puede comprobar sin Meta va antes del canje: el code es de un solo uso.
  const clave = claveDeEntorno();
  if (!clave) return { ok: false, error: "Falta WHATSAPP_CLAVE_TOKENS en el servidor." };
  try {
    cifrarToken("prueba", clave, i.marcaId);
  } catch {
    return { ok: false, error: "WHATSAPP_CLAVE_TOKENS no es válida (deben ser 32 bytes en base64)." };
  }
  const secreto = process.env.WHATSAPP_APP_SECRET;
  if (!secreto) return { ok: false, error: "Falta WHATSAPP_APP_SECRET en el servidor." };

  const hacerFetch = i.fetchImpl ?? fetch;
  const secretos = [i.code, secreto];

  const params = new URLSearchParams({ client_id: APP_ID, client_secret: secreto, code: i.code });
  const canje = await graph(hacerFetch, `${BASE}/oauth/access_token?${params}`, { method: "GET" }, secretos);
  const token = canje.ok && typeof canje.datos.access_token === "string" ? canje.datos.access_token : null;
  if (!token) {
    console.error("[whatsapp/conexion] canje del code:", canje.ok ? "sin access_token" : canje.error);
    return { ok: false, error: "Meta no aceptó la conexión. Vuelve a intentarlo desde el principio." };
  }
  secretos.push(token);

  const lista = await graph(hacerFetch, `${BASE}/${i.wabaId}/phone_numbers`, { method: "GET", token }, secretos);
  if (!lista.ok) {
    console.error("[whatsapp/conexion] números de la WABA:", lista.error);
    return { ok: false, error: `No se pudieron leer los números de la cuenta de WhatsApp: ${lista.error}` };
  }
  const ids = (Array.isArray(lista.datos.data) ? lista.datos.data : [])
    .map((n) => (n && typeof n === "object" ? (n as { id?: unknown }).id : null))
    .filter((id): id is string => typeof id === "string");
  const numeroId = i.numeroId ? (ids.includes(i.numeroId) ? i.numeroId : null) : ids.length === 1 ? ids[0] : null;
  if (!numeroId) return { ok: false, error: "Meta no ha devuelto el número conectado." };
  // El número de entorno es de Dinkbit aunque no figure en ventas_marcas.
  if (numeroId === process.env.WHATSAPP_PHONE_NUMBER_ID) return { ok: false, error: "Ese número ya está conectado a otra marca." };

  // Cifrado con la misma marca que se guarda: el AAD lo ata a ella.
  const guardado = await guardarConexion(i.marcaId, { wabaId: i.wabaId, numeroId, tokenCifrado: cifrarToken(token, clave, i.marcaId) });
  if (!guardado.ok) return guardado;

  const suscripcion = await graph(hacerFetch, `${BASE}/${i.wabaId}/subscribed_apps`, { method: "POST", token }, secretos);
  if (!suscripcion.ok) return falloTrasGuardar("suscribir la app a sus mensajes", suscripcion.error, i.marcaId);

  const sincronizar = (syncType: string) =>
    graph(
      hacerFetch,
      `${BASE}/${numeroId}/smb_app_data`,
      { method: "POST", token, cuerpo: { messaging_product: "whatsapp", sync_type: syncType } },
      secretos,
    );
  const contactos = await sincronizar("smb_app_state_sync");
  if (!contactos.ok) return falloTrasGuardar("pedir los contactos del móvil", contactos.error, i.marcaId);

  // Al reconectar no se vuelve a pedir: Meta solo lo acepta una vez, en las 24 h
  // siguientes a la conexión, y el estado que ya hay sigue valiendo.
  if (i.historialActual === "pedido" || i.historialActual === "completo") {
    return { ok: true, mensaje: "WhatsApp conectado. Los contactos irán llegando en los próximos minutos." };
  }
  const historial = await sincronizar("history");
  if (!historial.ok) {
    console.error(`[whatsapp/conexion] pedir el historial (marca ${i.marcaId}):`, historial.error);
    return {
      ok: false,
      error: "El número quedó conectado, pero Meta no aceptó la petición de historial: solo se puede pedir una vez, en las 24 h siguientes a la conexión.",
    };
  }

  await setHistorialMarca(i.marcaId, "pedido");
  return { ok: true, mensaje: "WhatsApp conectado. Los contactos y el historial irán llegando en los próximos minutos." };
}
