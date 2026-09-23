import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Conversacion } from "../db";
import type { MensajeroWhatsApp, ResultadoEnvio } from "../mensajero";

// `procesar.ts` llama directamente (fuera de `Deps`) a `getMarcaPorSlug` y
// `registrarActividad` de `ventas/db.ts` — son wiring de dominio, no del
// canal (ver task-7-brief.md). Se mockea el módulo entero para que nada de
// esto toque Supabase ni la red; el resto de dependencias las pasan los
// tests como `Deps` falsas.
const getMarcaPorSlugMock = vi.fn();
const registrarActividadMock = vi.fn();
// `buscarLeadPorContacto`/`crearLeads` solo los usa la fábrica de
// dependencias REALES (no ejercitada por estos tests, que siempre pasan su
// propio `deps`), pero el módulo los importa, así que necesitan un doble.
const buscarLeadPorContactoMock = vi.fn();
const crearLeadsMock = vi.fn();

vi.mock("../../ventas/db", () => ({
  getMarcaPorSlug: (...args: unknown[]) => getMarcaPorSlugMock(...args),
  registrarActividad: (...args: unknown[]) => registrarActividadMock(...args),
  buscarLeadPorContacto: (...args: unknown[]) => buscarLeadPorContactoMock(...args),
  crearLeads: (...args: unknown[]) => crearLeadsMock(...args),
}));

import { procesarWebhook, type Deps } from "../procesar";

const MARCA = { id: "marca-1", slug: "dinkbit" };

beforeEach(() => {
  getMarcaPorSlugMock.mockReset().mockResolvedValue(MARCA);
  registrarActividadMock.mockReset().mockResolvedValue({ ok: true });
  buscarLeadPorContactoMock.mockReset();
  crearLeadsMock.mockReset();
});

/* Sobres de Meta ------------------------------------------------------------ */

function sobreConMensajes(mensajes: Record<string, unknown>[]) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "1058918150452294",
        changes: [{ field: "messages", value: { messaging_product: "whatsapp", messages: mensajes } }],
      },
    ],
  };
}

function sobreConStatuses(statuses: Record<string, unknown>[]) {
  return {
    object: "whatsapp_business_account",
    entry: [{ id: "1058918150452294", changes: [{ field: "messages", value: { statuses } }] }],
  };
}

const mensajeDeAnuncio = (overrides: Record<string, unknown> = {}) => ({
  id: "wamid.ANUNCIO",
  from: "34660415514",
  timestamp: "1790000000",
  type: "text",
  text: { body: "Hola, quiero información" },
  referral: { source_id: "120200000000", headline: "Tu web en 7 días" },
  ...overrides,
});

const sobreDeAnuncio = sobreConMensajes([mensajeDeAnuncio()]);

/* Deps falsas ---------------------------------------------------------------- */

function depsFalsas(opts: { enviar?: (waId: string, texto: string) => Promise<ResultadoEnvio> } = {}) {
  const conversaciones = new Map<string, Conversacion>();
  const wamidsGuardados = new Set<string>();
  const salientes: Array<{ conversacionId: string; wamid: string | null; texto: string; error?: string }> = [];
  const leadsPorTelefono = new Map<string, { id: string }>();
  const estadosSeteados: Array<{ wamid: string; estado: string }> = [];
  let contadorConv = 0;
  let contadorLead = 0;

  const clave = (marcaId: string, waId: string) => `${marcaId}:${waId}`;

  const mensajero: MensajeroWhatsApp = {
    enviarTexto: opts.enviar ?? (async () => ({ ok: true, wamid: `wamid.saliente.${salientes.length + 1}` })),
  };

  const deps: Deps = {
    mensajero,
    async getConversacion(marcaId, waId) {
      return conversaciones.get(clave(marcaId, waId)) ?? null;
    },
    async crearConversacion({ marcaId, waId, leadId, estado, ventanaHasta }) {
      contadorConv += 1;
      const conv: Conversacion = {
        id: `conv-${contadorConv}`,
        marca_id: marcaId,
        lead_id: leadId,
        wa_id: waId,
        estado,
        ventana_hasta: ventanaHasta.toISOString(),
        ultimo_mensaje_at: new Date().toISOString(),
      };
      conversaciones.set(clave(marcaId, waId), conv);
      return conv;
    },
    async actualizarConversacion(id, cambios) {
      for (const conv of conversaciones.values()) {
        if (conv.id !== id) continue;
        if (cambios.estado !== undefined) conv.estado = cambios.estado;
        if (cambios.leadId !== undefined) conv.lead_id = cambios.leadId;
        if (cambios.ventanaHasta !== undefined) conv.ventana_hasta = cambios.ventanaHasta.toISOString();
      }
    },
    async guardarEntrante({ wamid }) {
      if (wamidsGuardados.has(wamid)) return { nuevo: false };
      wamidsGuardados.add(wamid);
      return { nuevo: true };
    },
    async guardarSaliente(input) {
      salientes.push({ conversacionId: input.conversacionId, wamid: input.wamid, texto: input.texto, error: input.error });
    },
    async setEstadoMensaje(wamid, estado) {
      estadosSeteados.push({ wamid, estado });
    },
    async buscarLeadPorTelefono(_marcaId, telefono) {
      return leadsPorTelefono.get(telefono) ?? null;
    },
    async crearLeadDeAnuncio({ telefono, waId }) {
      contadorLead += 1;
      const lead = { id: `lead-${contadorLead}` };
      leadsPorTelefono.set(telefono ?? waId, lead);
      return lead;
    },
  };

  return { deps, conversaciones, salientes, leadsPorTelefono, estadosSeteados };
}

/* Tests ------------------------------------------------------------------ */

describe("procesarWebhook", () => {
  it("un mensaje de anuncio crea lead, deja la conversación en bot y envía un texto", async () => {
    const { deps, conversaciones, salientes } = depsFalsas();

    const resultado = await procesarWebhook({ cuerpo: sobreDeAnuncio, deps });

    expect(resultado).toEqual({ procesados: 1 });
    const conv = conversaciones.get(`${MARCA.id}:34660415514`);
    expect(conv?.estado).toBe("bot");
    expect(conv?.lead_id).toBeTruthy();
    expect(salientes).toHaveLength(1);
    expect(salientes[0].error).toBeUndefined();
    expect(salientes[0].texto.length).toBeGreaterThan(0);
  });

  it("un reintento con el mismo wamid no envía una segunda vez", async () => {
    const { deps, salientes } = depsFalsas();

    await procesarWebhook({ cuerpo: sobreDeAnuncio, deps });
    const segundo = await procesarWebhook({ cuerpo: sobreDeAnuncio, deps });

    expect(segundo).toEqual({ procesados: 0 });
    expect(salientes).toHaveLength(1);
  });

  it("un cuerpo solo con statuses no escribe mensajes ni envía nada", async () => {
    const { deps, salientes, conversaciones, estadosSeteados } = depsFalsas();
    const cuerpo = sobreConStatuses([{ id: "wamid.SALIENTE", status: "delivered" }]);

    const resultado = await procesarWebhook({ cuerpo, deps });

    expect(resultado).toEqual({ procesados: 0 });
    expect(salientes).toHaveLength(0);
    expect(conversaciones.size).toBe(0);
    expect(estadosSeteados).toEqual([{ wamid: "wamid.SALIENTE", estado: "entregado" }]);
  });

  it("un fallo de envío no rompe el procesado", async () => {
    const { deps, salientes } = depsFalsas({ enviar: async () => ({ ok: false, error: "Authorization Error" }) });

    await expect(procesarWebhook({ cuerpo: sobreDeAnuncio, deps })).resolves.toEqual({ procesados: 1 });
    expect(salientes[0].error).toBe("Authorization Error");
  });

  it("un mensaje sin referral y sin conversación previa no dispara ninguna autorespuesta", async () => {
    const { deps, salientes, conversaciones } = depsFalsas();
    const cuerpo = sobreConMensajes([
      { id: "wamid.LIBRE", from: "34660415514", timestamp: "1790000000", type: "text", text: { body: "hola" } },
    ]);

    const resultado = await procesarWebhook({ cuerpo, deps });

    expect(resultado).toEqual({ procesados: 1 });
    expect(salientes).toHaveLength(0);
    const conv = conversaciones.get(`${MARCA.id}:34660415514`);
    expect(conv?.estado).toBe("humana");
  });

  // Cobertura extra del caso "responder": el teléfono ya es un lead (p.ej.
  // vino de otro canal) y llega un mensaje de anuncio sin conversación
  // previa. No debe crear un lead nuevo, y sí debe dejar rastro en su ficha
  // (Hallazgo 2 de la ronda de arreglos 1: "responder" no registraba nada).
  it("responder reutiliza el lead existente, no crea uno nuevo y registra actividad", async () => {
    const { deps, leadsPorTelefono, conversaciones } = depsFalsas();
    leadsPorTelefono.set("660415514", { id: "lead-preexistente" });
    const crearLeadDeAnuncioSpy = vi.spyOn(deps, "crearLeadDeAnuncio");

    await procesarWebhook({ cuerpo: sobreDeAnuncio, deps });

    expect(crearLeadDeAnuncioSpy).not.toHaveBeenCalled();
    const conv = conversaciones.get(`${MARCA.id}:34660415514`);
    expect(conv?.lead_id).toBe("lead-preexistente");
    expect(conv?.estado).toBe("bot");
    expect(registrarActividadMock).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: "lead-preexistente", tipo: "nota" }),
    );
  });

  // Cobertura extra de "guardar_respuesta": conversación en bot que recibe
  // una respuesta sin referral pasa a humana y queda como actividad del lead.
  it("guardar_respuesta pasa la conversación a humana y registra la nota en el lead", async () => {
    const { deps, conversaciones } = depsFalsas();
    await deps.crearConversacion({
      marcaId: MARCA.id,
      waId: "34660415514",
      leadId: "lead-1",
      estado: "bot",
      ventanaHasta: new Date(Date.now() + 1000 * 60 * 60),
    });

    const cuerpo = sobreConMensajes([
      { id: "wamid.RESPUESTA", from: "34660415514", timestamp: "1790000000", type: "text", text: { body: "Tengo un gimnasio" } },
    ]);
    const resultado = await procesarWebhook({ cuerpo, deps });

    expect(resultado).toEqual({ procesados: 1 });
    const conv = conversaciones.get(`${MARCA.id}:34660415514`);
    expect(conv?.estado).toBe("humana");
    expect(registrarActividadMock).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: "lead-1", tipo: "nota", nota: "Tengo un gimnasio" }),
    );
  });

  it("si la marca no existe, no procesa nada", async () => {
    getMarcaPorSlugMock.mockResolvedValue(null);
    const { deps, salientes } = depsFalsas();

    const resultado = await procesarWebhook({ cuerpo: sobreDeAnuncio, deps });

    expect(resultado).toEqual({ procesados: 0 });
    expect(salientes).toHaveLength(0);
  });

  it("solo_guardar con lead conocido por teléfono y sin conversación previa registra actividad", async () => {
    const { deps, leadsPorTelefono } = depsFalsas();
    leadsPorTelefono.set("660415514", { id: "lead-conocido" });
    const cuerpo = sobreConMensajes([
      { id: "wamid.LIBRE2", from: "34660415514", timestamp: "1790000000", type: "text", text: { body: "hola, ya hablamos antes" } },
    ]);

    const resultado = await procesarWebhook({ cuerpo, deps });

    expect(resultado).toEqual({ procesados: 1 });
    expect(registrarActividadMock).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: "lead-conocido", tipo: "nota", nota: "hola, ya hablamos antes" }),
    );
  });

  it("solo_guardar con conversación ya en humana no registra actividad otra vez", async () => {
    const { deps } = depsFalsas();
    await deps.crearConversacion({
      marcaId: MARCA.id,
      waId: "34660415514",
      leadId: "lead-1",
      estado: "humana",
      ventanaHasta: new Date(Date.now() + 1000 * 60 * 60),
    });
    registrarActividadMock.mockClear();

    const cuerpo = sobreConMensajes([
      { id: "wamid.OTRA", from: "34660415514", timestamp: "1790000000", type: "text", text: { body: "sigo aquí" } },
    ]);
    await procesarWebhook({ cuerpo, deps });

    expect(registrarActividadMock).not.toHaveBeenCalled();
  });

  // Hallazgo 1 (Critical) de la ronda de arreglos 1: un fallo ANTES de
  // guardar el mensaje (fase A) es reintentable y debe propagar, no
  // tragarse. `getConversacion` es lo primero que se llama.
  it("si getConversacion lanza, procesarWebhook propaga el fallo en vez de tragarlo", async () => {
    const { deps } = depsFalsas();
    deps.getConversacion = async () => {
      throw new Error("timeout de Supabase");
    };

    await expect(procesarWebhook({ cuerpo: sobreDeAnuncio, deps })).rejects.toThrow("timeout de Supabase");
  });

  // Hallazgo 3 (Important): un fallo DESPUÉS de haber persistido el mensaje
  // (guardar el saliente, tras un envío que sí pudo tener éxito) es fase B:
  // nunca debe tumbar el procesado, solo queda registrado.
  it("si guardarSaliente lanza tras un envío con éxito, procesarWebhook no lanza y queda logueado", async () => {
    const { deps } = depsFalsas();
    deps.guardarSaliente = async () => {
      throw new Error("fallo guardando el saliente");
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(procesarWebhook({ cuerpo: sobreDeAnuncio, deps })).resolves.toEqual({ procesados: 1 });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  // Hallazgo 4 (Important): dos entregas concurrentes del mismo mensaje de
  // anuncio no deben producir dos leads. El índice único (marca_id, wa_id)
  // de ventas_conversaciones es el mutex real: se simula la colisión en la
  // primera llamada a crearConversacion (como si la otra entrega ya hubiera
  // ganado la carrera e insertado la fila) y se comprueba que solo se crea
  // un lead y que la conversación reutilizada es la que "ganó".
  it("si crearConversacion choca con el índice único, relee la existente y no duplica el lead", async () => {
    const { deps, conversaciones, leadsPorTelefono } = depsFalsas();
    const crearConversacionOriginal = deps.crearConversacion;
    let primeraLlamada = true;
    deps.crearConversacion = async (input) => {
      if (primeraLlamada) {
        primeraLlamada = false;
        const conv: Conversacion = {
          id: "conv-ganadora",
          marca_id: input.marcaId,
          lead_id: null,
          wa_id: input.waId,
          estado: input.estado,
          ventana_hasta: input.ventanaHasta.toISOString(),
          ultimo_mensaje_at: new Date().toISOString(),
        };
        conversaciones.set(`${input.marcaId}:${input.waId}`, conv);
        throw new Error("duplicate key value violates unique constraint");
      }
      return crearConversacionOriginal(input);
    };

    const resultado = await procesarWebhook({ cuerpo: sobreDeAnuncio, deps });

    expect(resultado).toEqual({ procesados: 1 });
    expect(leadsPorTelefono.size).toBe(1);
    const conv = conversaciones.get(`${MARCA.id}:34660415514`);
    expect(conv?.id).toBe("conv-ganadora");
    expect(conv?.lead_id).toBeTruthy();
  });
});
