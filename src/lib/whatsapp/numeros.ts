import "server-only";
import { getSupabaseAdmin } from "../supabase-admin";
import { ErrorLectura, tolerarMigracionPendiente, type Escritura, type Marca } from "../ventas/db";
import { descifrarToken, claveDeEntorno } from "./cifrado";
import { crearMensajero, type MensajeroWhatsApp, type ResultadoEnvio } from "./mensajero";

// Acceso por marca a su número de WhatsApp: búsqueda por número/WABA, estado de
// la conexión, token cifrado y el mensajero que envía con sus credenciales.

const ERROR_CREDENCIALES = "La marca no tiene credenciales de WhatsApp válidas: reconéctala.";

function sb() {
  const cliente = getSupabaseAdmin();
  if (!cliente) throw new Error("Supabase no está configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  return cliente;
}

/** Lanza ErrorLectura (con código) para que tolerarMigracionPendiente lo reconozca. */
function leer<T>(r: { data: T | null; error: { message: string; code?: string } | null }, contexto: string): T | null {
  if (r.error) throw new ErrorLectura(`[whatsapp/numeros] ${contexto}: ${r.error.message}`, r.error.code);
  return r.data;
}

async function marcaPor(columna: "whatsapp_phone_number_id" | "whatsapp_waba_id", valor: string, contexto: string): Promise<Marca | null> {
  return tolerarMigracionPendiente(
    async () => leer(await sb().from("ventas_marcas").select("*").eq(columna, valor).maybeSingle(), contexto) as Marca | null,
    () => null,
    contexto,
  );
}

export function getMarcaPorNumero(numeroId: string): Promise<Marca | null> {
  return marcaPor("whatsapp_phone_number_id", numeroId, "getMarcaPorNumero");
}

export function getMarcaPorWaba(wabaId: string): Promise<Marca | null> {
  return marcaPor("whatsapp_waba_id", wabaId, "getMarcaPorWaba");
}

export async function guardarConexion(
  marcaId: string,
  c: { wabaId: string; numeroId: string; tokenCifrado: string },
): Promise<Escritura> {
  const ahora = new Date().toISOString();
  const u = await sb()
    .from("ventas_marcas")
    .update({
      whatsapp_phone_number_id: c.numeroId,
      whatsapp_waba_id: c.wabaId,
      whatsapp_estado: "conectado",
      whatsapp_conectado_en: ahora,
      whatsapp_motivo: null,
    })
    .eq("id", marcaId);
  if (u.error) return fallo(u.error, "guardarConexion");

  const t = await sb()
    .from("ventas_whatsapp_credenciales")
    .upsert({ marca_id: marcaId, token_cifrado: c.tokenCifrado, actualizado_en: ahora }, { onConflict: "marca_id" });
  if (t.error) return fallo(t.error, "guardarConexion (token)");
  return { ok: true };
}

// Nunca se registra el contenido de la fila: solo el mensaje de la base.
function fallo(error: { message: string; code?: string }, contexto: string): Escritura {
  console.error(`[whatsapp/numeros] ${contexto}:`, error.message);
  if (error.code === "23505") return { ok: false, error: "Ese número ya está conectado a otra marca." };
  return { ok: false, error: "No se pudo guardar. Vuelve a intentarlo." };
}

export async function marcarDesconectada(marcaId: string, motivo: string | null): Promise<void> {
  const r = await sb().from("ventas_marcas").update({ whatsapp_estado: "desconectado", whatsapp_motivo: motivo }).eq("id", marcaId);
  if (r.error) console.error("[whatsapp/numeros] marcarDesconectada:", r.error.message);
}

export async function setHistorialMarca(marcaId: string, estado: "pedido" | "completo" | "rechazado"): Promise<void> {
  const r = await sb().from("ventas_marcas").update({ whatsapp_historial: estado }).eq("id", marcaId);
  if (r.error) console.error("[whatsapp/numeros] setHistorialMarca:", r.error.message);
}

export async function getTokenCifrado(marcaId: string): Promise<string | null> {
  return tolerarMigracionPendiente(
    async () => {
      const fila = leer(
        await sb().from("ventas_whatsapp_credenciales").select("token_cifrado").eq("marca_id", marcaId).maybeSingle(),
        "getTokenCifrado",
      ) as { token_cifrado: string } | null;
      return fila?.token_cifrado ?? null;
    },
    () => null,
    "getTokenCifrado",
  );
}

/** Mensajero cuyos envíos fallan siempre; jamás toca la red ni el entorno. */
function mensajeroSinCredenciales(): MensajeroWhatsApp {
  const fallido = async (): Promise<ResultadoEnvio> => ({ ok: false, error: ERROR_CREDENCIALES });
  return { enviarTexto: fallido, enviarBotones: fallido };
}

export async function mensajeroDeMarca(marca: Marca): Promise<MensajeroWhatsApp> {
  const numeroId = marca.whatsapp_phone_number_id;
  if (!numeroId) return crearMensajero();

  try {
    const cifrado = await getTokenCifrado(marca.id);
    const clave = claveDeEntorno();
    if (!cifrado || !clave) return mensajeroSinCredenciales();
    const token = descifrarToken(cifrado, clave);
    return crearMensajero({ token, phoneNumberId: numeroId, exigirProduccion: true });
  } catch {
    // Sin detalle: el error de descifrado no debe arrastrar token ni clave.
    return mensajeroSinCredenciales();
  }
}
