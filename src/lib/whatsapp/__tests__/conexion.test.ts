import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";

const m = vi.hoisted(() => ({
  guardarConexion: vi.fn(),
  setHistorialMarca: vi.fn(),
}));
vi.mock("../numeros", () => ({ guardarConexion: m.guardarConexion, setHistorialMarca: m.setHistorialMarca }));

import { descifrarToken } from "../cifrado";
import { conectarNumero } from "../conexion";

const CLAVE = randomBytes(32).toString("base64");
const SECRETO = "secreto-de-la-app";
const CODE = "codigo-de-un-solo-uso";
const TOKEN = "EAAtoken-de-negocio";

type Llamada = { metodo: string; ruta: string; params: URLSearchParams; cuerpo: unknown; auth: string | null };

/** fetch falso: responde por ruta y apunta cada llamada en orden. */
function fetchFalso(respuestas: Record<string, { status?: number; cuerpo: unknown }> = {}) {
  const llamadas: Llamada[] = [];
  const porDefecto: Record<string, { status?: number; cuerpo: unknown }> = {
    "GET /oauth/access_token": { cuerpo: { access_token: TOKEN, token_type: "bearer" } },
    "GET /111/phone_numbers": { cuerpo: { data: [{ id: "222", display_phone_number: "+34 600 111 222" }] } },
    "POST /111/subscribed_apps": { cuerpo: { success: true } },
    "POST /222/smb_app_data": { cuerpo: { success: true } },
  };
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = new URL(String(url));
    const ruta = u.pathname.replace(/^\/v\d+\.\d+/, "");
    const metodo = init?.method ?? "GET";
    const cuerpo = init?.body ? JSON.parse(String(init.body)) : null;
    const headers = new Headers(init?.headers);
    llamadas.push({ metodo, ruta, params: u.searchParams, cuerpo, auth: headers.get("Authorization") });
    const clave = `${metodo} ${ruta}`;
    const r = respuestas[clave] ?? porDefecto[clave] ?? { status: 404, cuerpo: { error: { message: "ruta desconocida" } } };
    return new Response(JSON.stringify(r.cuerpo), { status: r.status ?? 200 });
  });
  return { impl: impl as unknown as typeof fetch, llamadas };
}

const base = { marcaId: "m1", code: CODE, wabaId: "111", numeroId: "222" as string | null };

beforeEach(() => {
  m.guardarConexion.mockReset().mockResolvedValue({ ok: true });
  m.setHistorialMarca.mockReset().mockResolvedValue(undefined);
  vi.stubEnv("WHATSAPP_CLAVE_TOKENS", CLAVE);
  vi.stubEnv("WHATSAPP_APP_SECRET", SECRETO);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("conectarNumero", () => {
  it("camino feliz: canje, número, guardado, suscripción, contactos, historial", async () => {
    const f = fetchFalso();
    const r = await conectarNumero({ ...base, fetchImpl: f.impl });
    expect(r.ok).toBe(true);

    expect(f.llamadas.map((l) => `${l.metodo} ${l.ruta}`)).toEqual([
      "GET /oauth/access_token",
      "GET /111/phone_numbers",
      "POST /111/subscribed_apps",
      "POST /222/smb_app_data",
      "POST /222/smb_app_data",
    ]);
    const [canje, numeros, suscripcion, contactos, historial] = f.llamadas;
    expect(canje.params.get("client_id")).toBe("1444585017092524");
    expect(canje.params.get("client_secret")).toBe(SECRETO);
    expect(canje.params.get("code")).toBe(CODE);
    expect(numeros.auth).toBe(`Bearer ${TOKEN}`);
    expect(suscripcion.auth).toBe(`Bearer ${TOKEN}`);
    expect(contactos.cuerpo).toEqual({ messaging_product: "whatsapp", sync_type: "smb_app_state_sync" });
    expect(historial.cuerpo).toEqual({ messaging_product: "whatsapp", sync_type: "history" });

    // Guardado entre la comprobación del número y la suscripción, con el token cifrado para su marca.
    expect(m.guardarConexion).toHaveBeenCalledTimes(1);
    const [marcaId, conexion] = m.guardarConexion.mock.calls[0];
    expect(marcaId).toBe("m1");
    expect(conexion.wabaId).toBe("111");
    expect(conexion.numeroId).toBe("222");
    expect(JSON.stringify(m.guardarConexion.mock.calls[0])).not.toContain(TOKEN);
    expect(descifrarToken(conexion.tokenCifrado, CLAVE, "m1")).toBe(TOKEN);
    expect(m.guardarConexion.mock.invocationCallOrder[0]).toBeLessThan(
      (f.impl as unknown as ReturnType<typeof vi.fn>).mock.invocationCallOrder[2],
    );

    expect(m.setHistorialMarca).toHaveBeenCalledWith("m1", "pedido");
  });

  it("sin numeroId usa el único número de la WABA", async () => {
    const f = fetchFalso();
    const r = await conectarNumero({ ...base, numeroId: null, fetchImpl: f.impl });
    expect(r.ok).toBe(true);
    expect(m.guardarConexion.mock.calls[0][1].numeroId).toBe("222");
  });

  it("sin numeroId y con dos números en la WABA: error sin guardar", async () => {
    const f = fetchFalso({ "GET /111/phone_numbers": { cuerpo: { data: [{ id: "222" }, { id: "333" }] } } });
    const r = await conectarNumero({ ...base, numeroId: null, fetchImpl: f.impl });
    expect(r).toEqual({ ok: false, error: "Meta no ha devuelto el número conectado." });
    expect(m.guardarConexion).not.toHaveBeenCalled();
    expect(f.llamadas).toHaveLength(2);
  });

  it("un numeroId que no está en la WABA: error sin guardar", async () => {
    const f = fetchFalso();
    const r = await conectarNumero({ ...base, numeroId: "999", fetchImpl: f.impl });
    expect(r).toEqual({ ok: false, error: "Meta no ha devuelto el número conectado." });
    expect(m.guardarConexion).not.toHaveBeenCalled();
  });

  it("si el número es de otra marca: error de unicidad y no se suscribe ni sincroniza", async () => {
    m.guardarConexion.mockResolvedValue({ ok: false, error: "Ese número ya está conectado a otra marca." });
    const f = fetchFalso();
    const r = await conectarNumero({ ...base, fetchImpl: f.impl });
    expect(r).toEqual({ ok: false, error: "Ese número ya está conectado a otra marca." });
    expect(f.llamadas.map((l) => l.ruta)).toEqual(["/oauth/access_token", "/111/phone_numbers"]);
    expect(m.setHistorialMarca).not.toHaveBeenCalled();
  });

  it("sin clave de cifrado: error sin llamar a Meta", async () => {
    vi.stubEnv("WHATSAPP_CLAVE_TOKENS", "");
    const f = fetchFalso();
    const r = await conectarNumero({ ...base, fetchImpl: f.impl });
    expect(r).toEqual({ ok: false, error: "Falta WHATSAPP_CLAVE_TOKENS en el servidor." });
    expect(f.llamadas).toHaveLength(0);
  });

  it("con una clave que no mide 32 bytes: error sin llamar a Meta (el code no se gasta)", async () => {
    vi.stubEnv("WHATSAPP_CLAVE_TOKENS", Buffer.from("corta").toString("base64"));
    const f = fetchFalso();
    const r = await conectarNumero({ ...base, fetchImpl: f.impl });
    expect(r.ok).toBe(false);
    expect(f.llamadas).toHaveLength(0);
  });

  it("sin secreto de la app: error sin llamar a Meta", async () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", "");
    const f = fetchFalso();
    const r = await conectarNumero({ ...base, fetchImpl: f.impl });
    expect(r).toEqual({ ok: false, error: "Falta WHATSAPP_APP_SECRET en el servidor." });
    expect(f.llamadas).toHaveLength(0);
  });

  it("si Meta rechaza el code: error sin code, token ni secreto, y no guarda", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const f = fetchFalso({
      "GET /oauth/access_token": {
        status: 400,
        cuerpo: { error: { message: `Invalid code ${CODE} for secret ${SECRETO}`, code: 100 } },
      },
    });
    const r = await conectarNumero({ ...base, fetchImpl: f.impl });
    expect(r.ok).toBe(false);
    const texto = JSON.stringify(r) + JSON.stringify(error.mock.calls);
    expect(texto).not.toContain(CODE);
    expect(texto).not.toContain(SECRETO);
    expect(m.guardarConexion).not.toHaveBeenCalled();
  });

  it("si falla la suscripción: ok:false con el paso, sin deshacer la conexión ni sincronizar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const f = fetchFalso({ "POST /111/subscribed_apps": { status: 500, cuerpo: { error: { message: "caído" } } } });
    const r = await conectarNumero({ ...base, fetchImpl: f.impl });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/suscrib/i);
    expect(m.guardarConexion).toHaveBeenCalledTimes(1);
    expect(f.llamadas.map((l) => l.ruta)).not.toContain("/222/smb_app_data");
    expect(m.setHistorialMarca).not.toHaveBeenCalled();
  });

  it("si falla el historial: ok:false con el paso y no marca el historial como pedido", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let n = 0;
    const f = fetchFalso();
    const impl = (async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("smb_app_data") && ++n === 2) {
        return new Response(JSON.stringify({ error: { message: "no" } }), { status: 400 });
      }
      return f.impl(url, init);
    }) as typeof fetch;
    const r = await conectarNumero({ ...base, fetchImpl: impl });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/historial/i);
    expect(m.setHistorialMarca).not.toHaveBeenCalled();
  });

  it("un fallo de red en el canje es un error, no una excepción", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const impl = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    const r = await conectarNumero({ ...base, fetchImpl: impl });
    expect(r.ok).toBe(false);
  });
});
