import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";

let tokenGuardado: string | null = null;
let errorUpdate: { message: string; code?: string } | null = null;
const ordenEscrituras: string[] = [];
let errorLectura: { message: string; code?: string } | null = null;

vi.mock("../../supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: (tabla: string) => {
      if (tabla === "ventas_whatsapp_credenciales") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () =>
                errorLectura
                  ? { data: null, error: errorLectura }
                  : { data: tokenGuardado ? { token_cifrado: tokenGuardado } : null, error: null },
            }),
          }),
          upsert: async () => (ordenEscrituras.push("token"), { error: null }),
        };
      }
      return {
        update: () => ({ eq: async () => (ordenEscrituras.push("marca"), { error: errorUpdate }) }),
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: errorLectura }) }) }),
      };
    },
  }),
}));

import { cifrarToken } from "../cifrado";
import { getMarcaPorNumero, getTokenCifrado, guardarConexion, mensajeroDeMarca } from "../numeros";
import type { Marca } from "../../ventas/db";

const clave = randomBytes(32).toString("base64");
const marca = (extra: Partial<Marca> = {}) => ({ id: "m1", nombre: "X", slug: "x", ...extra }) as Marca;

describe("mensajeroDeMarca", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    tokenGuardado = null;
    errorLectura = null;
    errorUpdate = null;
    fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({ messages: [{ id: "wamid.1" }] }) });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("WHATSAPP_CLAVE_TOKENS", clave);
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("WHATSAPP_ENVIO_REAL", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("marca sin número usa las credenciales de entorno", async () => {
    vi.stubEnv("WHATSAPP_TOKEN", "tok-env");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "env-1");
    const res = await (await mensajeroDeMarca(marca())).enviarTexto("34600", "hola");
    expect(res.ok).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toContain("/env-1/messages");
  });

  it("marca con número y token válido envía con su número y token", async () => {
    tokenGuardado = cifrarToken("tok-marca", clave, "m1");
    const res = await (await mensajeroDeMarca(marca({ whatsapp_phone_number_id: "999" }))).enviarTexto("34600", "hola");
    expect(res.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://graph.facebook.com/v21.0/999/messages");
    expect(init.headers.Authorization).toBe("Bearer tok-marca");
  });

  it("token que no descifra: error de credenciales y sin fetch ni entorno", async () => {
    vi.stubEnv("WHATSAPP_TOKEN", "tok-env");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "env-1");
    tokenGuardado = "v1:basura:basura:basura";
    const m = await mensajeroDeMarca(marca({ whatsapp_phone_number_id: "999" }));
    const esperado = { ok: false, error: "La marca no tiene credenciales de WhatsApp válidas: reconéctala." };
    expect(await m.enviarTexto("34600", "hola")).toEqual(esperado);
    expect(await m.enviarBotones("34600", "hola", ["Sí"])).toEqual(esperado);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("token cifrado para otra marca: credenciales inválidas y sin fetch", async () => {
    tokenGuardado = cifrarToken("tok-otra", clave, "otra-marca");
    const m = await mensajeroDeMarca(marca({ whatsapp_phone_number_id: "999" }));
    expect((await m.enviarTexto("34600", "hola")).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin token guardado también falla sin fetch", async () => {
    const m = await mensajeroDeMarca(marca({ whatsapp_phone_number_id: "999" }));
    expect((await m.enviarTexto("34600", "hola")).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("exigirProduccion: fuera de producción queda simulado", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    tokenGuardado = cifrarToken("tok-marca", clave, "m1");
    const res = await (await mensajeroDeMarca(marca({ whatsapp_phone_number_id: "999" }))).enviarTexto("34600", "hola");
    expect(res).toEqual({ ok: true, wamid: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("lecturas tolerantes y escritura", () => {
  beforeEach(() => {
    errorLectura = null;
    errorUpdate = null;
    tokenGuardado = null;
  });

  it("con la migración pendiente las lecturas devuelven null", async () => {
    errorLectura = { message: "no existe", code: "42703" };
    expect(await getMarcaPorNumero("1")).toBeNull();
    errorLectura = { message: "no existe", code: "42P01" };
    expect(await getTokenCifrado("m1")).toBeNull();
  });

  it("otros errores de lectura se lanzan", async () => {
    errorLectura = { message: "red", code: "08006" };
    await expect(getMarcaPorNumero("1")).rejects.toThrow();
  });

  it("unicidad en guardarConexion da el mensaje de número ya conectado", async () => {
    errorUpdate = { message: "duplicate key", code: "23505" };
    const r = await guardarConexion("m1", { wabaId: "w", numeroId: "n", tokenCifrado: "SECRETO" });
    expect(r).toEqual({ ok: false, error: "Ese número ya está conectado a otra marca." });
  });

  it("guardarConexion correcto: primero el token y luego la marca", async () => {
    ordenEscrituras.length = 0;
    expect(await guardarConexion("m1", { wabaId: "w", numeroId: "n", tokenCifrado: "x" })).toEqual({ ok: true });
    expect(ordenEscrituras).toEqual(["token", "marca"]);
  });
});
