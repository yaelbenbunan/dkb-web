import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Conversacion } from "../db";
import type { MensajeroWhatsApp, ResultadoEnvio } from "../mensajero";
import type { SecuenciaRow } from "../../ventas/db";
import type { Secuencia } from "../../ventas/secuencias";

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

// Función (no constante) para poder variar el anuncio: la elección de
// secuencia (`elegirSecuencia`) decide por `referral.anuncio`, así que los
// tests de la tarea 7 necesitan poder fijarlo. El valor por defecto conserva
// el que usaban las llamadas antiguas de este fichero (`sobreDeAnuncio`, sin
// argumento) para no tener que tocar sus aserciones.
const sobreDeAnuncio = (anuncio = "120200000000") =>
  sobreConMensajes([mensajeDeAnuncio({ referral: { source_id: anuncio, headline: "Tu web en 7 días" } })]);

/* Sobres de respuesta del lead (tarea 8) ------------------------------------ */

// Sin `referral`: `decidir()` los clasifica como "guardar_respuesta" cuando
// la conversación ya está en "bot" (que es justo el caso que arranca la
// secuencia). `wamid` incorpora el id del botón y el texto para que dos
// llamadas a `sobrePulsacion`/`sobreTexto` con distinto contenido no choquen
// por idempotencia sin querer, y para que reusar la MISMA llamada (el test
// del reintento) sí produzca el mismo wamid a propósito.
const sobrePulsacion = (botonId: string, tituloTexto: string, waId = "34660415514") =>
  sobreConMensajes([
    {
      id: `wamid.BOTON.${botonId}.${tituloTexto}`,
      from: waId,
      timestamp: "1790000100",
      type: "interactive",
      interactive: { type: "button_reply", button_reply: { id: botonId, title: tituloTexto } },
    },
  ]);

const sobreTexto = (texto: string, waId = "34660415514") =>
  sobreConMensajes([
    { id: `wamid.TEXTO.${texto}`, from: waId, timestamp: "1790000100", type: "text", text: { body: texto } },
  ]);

/* Secuencias de prueba (tarea 7) --------------------------------------------- */

/** Un paso con tres botones que cierran la conversación: basta para
 *  comprobar que `mensajesAEnviar(null, estado)` manda el primer paso. */
const SECUENCIA_MINIMA: Secuencia = {
  version: 1,
  inicio: "problemas",
  pasos: {
    problemas: {
      tipo: "mensaje",
      texto: "¿Qué te pasa?",
      botones: [
        { texto: "Faltan pacientes", ruta: { terminar: true } },
        { texto: "No vuelven", ruta: { terminar: true } },
        { texto: "Boca a boca", ruta: { terminar: true } },
      ],
    },
  },
};

/** Usa `{{ciudad}}`, variable que un lead de WhatsApp nunca trae: sirve para
 *  comprobar que el hueco se deja visible y el envío no se bloquea. */
const SECUENCIA_CON_CIUDAD: Secuencia = {
  version: 1,
  inicio: "saludo",
  pasos: {
    saludo: {
      tipo: "mensaje",
      texto: "Hola desde {{ciudad}}",
      botones: [],
      ruta: { terminar: true },
    },
  },
};

/** Usa `{{contacto}}`: sirve para comprobar (ronda de arreglos 1, Hallazgo 1)
 *  que un lead ya conocido por teléfono rellena la variable con su nombre en
 *  vez de dejar el hueco. */
const SECUENCIA_CON_CONTACTO: Secuencia = {
  version: 1,
  inicio: "saludo",
  pasos: {
    saludo: {
      tipo: "mensaje",
      texto: "Hola {{contacto}}",
      botones: [],
      ruta: { terminar: true },
    },
  },
};

/* Deps falsas ---------------------------------------------------------------- */

/** Lo mínimo que le importa a `elegirSecuencia`/`parsearSecuencia`; el resto
 *  de columnas de `SecuenciaRow` no influyen en este módulo, así que
 *  `depsFalsas` las rellena con valores de relleno para que el tipo cuadre
 *  sin obligar a cada test a escribirlas. */
type SecuenciaFalsa = Pick<SecuenciaRow, "id" | "estado" | "anuncios" | "pasos">;

/* Secuencias de prueba (tarea 8) --------------------------------------------- */

/** Un paso inicial con dos botones que llevan cada uno a su propio cierre:
 *  sirve para comprobar que el botón pulsado lleva a SU rama y no a otra. */
const SECUENCIA_ACTIVA_PASOS: Secuencia = {
  version: 1,
  inicio: "inicio",
  pasos: {
    inicio: {
      tipo: "mensaje",
      texto: "¿Cuántas veces vienen tus clientes?",
      botones: [
        { texto: "Vienen bastante", ruta: { ir_a: "cierre_uno" } },
        { texto: "Vienen 1 vez y ya", ruta: { ir_a: "cierre_dos" } },
      ],
    },
    cierre_uno: {
      tipo: "mensaje",
      texto: "Vale, aquí el mensaje del cierre uno",
      botones: [],
      ruta: { terminar: true },
    },
    cierre_dos: {
      tipo: "mensaje",
      texto: "Vale, aquí el mensaje del cierre dos",
      botones: [],
      ruta: { terminar: true },
    },
  },
};

const SECUENCIA_ACTIVA: SecuenciaFalsa = {
  id: "s1",
  estado: "activa",
  anuncios: ["AD1"],
  pasos: SECUENCIA_ACTIVA_PASOS,
};

/** Igual que `SECUENCIA_ACTIVA_PASOS` pero sin el paso «cierre_uno»: simula
 *  que alguien editó la secuencia con esta conversación en vuelo, así que su
 *  `paso_actual` guardado ("inicio") sigue existiendo pero la ruta de uno de
 *  sus botones ya no lleva a ningún sitio. */
const SECUENCIA_SIN_ESE_PASO: Secuencia = {
  version: 1,
  inicio: "inicio",
  pasos: {
    inicio: SECUENCIA_ACTIVA_PASOS.pasos.inicio,
    cierre_dos: SECUENCIA_ACTIVA_PASOS.pasos.cierre_dos,
  },
};

/** Igual que `SECUENCIA_ACTIVA_PASOS` pero el paso «inicio» se quedó con un
 *  solo botón: simula editar la secuencia con la conversación en vuelo de
 *  forma que el botón que el lead ya tiene delante (el segundo) deja de
 *  existir. `indiceDeBoton` sigue traduciendo su id igual (el formato no
 *  cambia), así que `responderBoton` recibe un índice fuera de rango
 *  (ronda de arreglos 1, Hallazgo 1 Critical). */
const SECUENCIA_MENOS_BOTONES: Secuencia = {
  version: 1,
  inicio: "inicio",
  pasos: {
    inicio: {
      ...SECUENCIA_ACTIVA_PASOS.pasos.inicio,
      botones: [SECUENCIA_ACTIVA_PASOS.pasos.inicio.botones[0]],
    },
    cierre_uno: SECUENCIA_ACTIVA_PASOS.pasos.cierre_uno,
  },
};

/** Lo que un lead falso puede traer para rellenar `ContextoSimulacion`. Todo
 *  opcional: la mayoría de tests no necesitan estos datos, así que
 *  `depsFalsas` los rellena con relleno neutro (negocio genérico, sin
 *  contacto ni ciudad) cuando el test no los da. */
type LeadFalso = { id: string; negocio?: string; contacto?: string | null; ciudad?: string | null };

function depsFalsas(
  opts: {
    enviar?: (waId: string, texto: string) => Promise<ResultadoEnvio>;
    secuencias?: SecuenciaFalsa[];
  } = {},
) {
  const conversaciones = new Map<string, Conversacion>();
  const wamidsGuardados = new Set<string>();
  const salientes: Array<{ conversacionId: string; wamid: string | null; texto: string; error?: string }> = [];
  const leadsPorTelefono = new Map<string, LeadFalso>();
  const estadosSeteados: Array<{ wamid: string; estado: string }> = [];
  const secuencias: SecuenciaRow[] = (opts.secuencias ?? []).map((s) => ({
    marca_id: MARCA.id,
    nombre: s.id,
    creada_por: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...s,
  }));
  let contadorConv = 0;
  let contadorLead = 0;

  // `registrarActividad` no vive en `Deps` (es wiring de dominio, ver la
  // cabecera del fichero): se mockea a nivel de módulo. Aquí se le da una
  // implementación que además deja rastro en `actividades`, para que los
  // tests de la tarea 8 puedan comprobar que se avisó a la comercial sin
  // acoplarse a cuántas veces se llama ni en qué orden.
  const actividades: Array<{ leadId: string; tipo: string; nota: string }> = [];
  registrarActividadMock.mockReset().mockImplementation(async (input: { leadId: string; tipo: string; nota: string }) => {
    actividades.push({ leadId: input.leadId, tipo: input.tipo, nota: input.nota });
    return { ok: true };
  });

  const clave = (marcaId: string, waId: string) => `${marcaId}:${waId}`;
  /** Completa un `LeadFalso` con relleno neutro, para que el resto del
   *  módulo (que exige `negocio`/`contacto`/`ciudad`, ronda de arreglos 1)
   *  no obligue a cada test a escribirlos si no le importan. */
  const conDatosCompletos = (lead: LeadFalso) => ({
    negocio: lead.negocio ?? "Lead de prueba",
    contacto: lead.contacto ?? null,
    ciudad: lead.ciudad ?? null,
    id: lead.id,
  });

  const enviar = opts.enviar ?? (async () => ({ ok: true, wamid: `wamid.saliente.${salientes.length + 1}` }));
  // Registra CADA envío con qué método se llamó (texto o botones) y con qué
  // opciones: sin esto (ronda de arreglos 1, Hallazgo 3) un test podía pasar
  // aunque el código llamara siempre a `enviarTexto`, porque ambos métodos
  // delegaban en el mismo `enviar` sin dejar rastro de cuál se usó.
  const enviosMensajero: Array<{ metodo: "texto" | "botones"; waId: string; texto: string; opciones?: readonly string[] }> = [];
  const mensajero: MensajeroWhatsApp = {
    async enviarTexto(waId, texto) {
      enviosMensajero.push({ metodo: "texto", waId, texto });
      return enviar(waId, texto);
    },
    async enviarBotones(waId, texto, opciones) {
      enviosMensajero.push({ metodo: "botones", waId, texto, opciones });
      return enviar(waId, texto);
    },
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
        // Campos de la secuencia (tarea 5): sin uso en este test, se dejan en
        // su estado "todavía no ha empezado".
        secuencia_id: null,
        paso_actual: null,
        datos: {},
        reanudar_en: null,
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
        if (cambios.secuenciaId !== undefined) conv.secuencia_id = cambios.secuenciaId;
        if (cambios.pasoActual !== undefined) conv.paso_actual = cambios.pasoActual;
        if (cambios.datos !== undefined) conv.datos = cambios.datos;
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
      const lead = leadsPorTelefono.get(telefono);
      return lead ? conDatosCompletos(lead) : null;
    },
    async crearLeadDeAnuncio({ telefono, waId }) {
      contadorLead += 1;
      const lead = { id: `lead-${contadorLead}` };
      leadsPorTelefono.set(telefono ?? waId, lead);
      return conDatosCompletos(lead);
    },
    async listSecuencias() {
      return secuencias;
    },
  };

  return { deps, conversaciones, salientes, leadsPorTelefono, estadosSeteados, enviosMensajero, secuencias, actividades };
}

/* Tests ------------------------------------------------------------------ */

describe("procesarWebhook", () => {
  it("un mensaje de anuncio crea lead, deja la conversación en bot y envía un texto", async () => {
    const { deps, conversaciones, salientes } = depsFalsas();

    const resultado = await procesarWebhook({ cuerpo: sobreDeAnuncio(), deps });

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

    await procesarWebhook({ cuerpo: sobreDeAnuncio(), deps });
    const segundo = await procesarWebhook({ cuerpo: sobreDeAnuncio(), deps });

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

    await expect(procesarWebhook({ cuerpo: sobreDeAnuncio(), deps })).resolves.toEqual({ procesados: 1 });
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

    await procesarWebhook({ cuerpo: sobreDeAnuncio(), deps });

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

  // Hallazgo I2 (Important) de la ronda de arreglos 2: si la marca no existe
  // (las migraciones son manuales, así que es el estado más probable el día
  // del despliegue) el fallo se PROPAGA para que la ruta responda 500 y Meta
  // reintente — antes se tragaba con un `{ procesados: 0 }` y un 200, y el
  // mensaje se perdía para siempre.
  it("si la marca no existe, propaga el fallo en vez de tragárselo", async () => {
    getMarcaPorSlugMock.mockResolvedValue(null);
    const { deps, salientes } = depsFalsas();

    await expect(procesarWebhook({ cuerpo: sobreDeAnuncio(), deps })).rejects.toThrow('no existe la marca "dinkbit"');
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

    await expect(procesarWebhook({ cuerpo: sobreDeAnuncio(), deps })).rejects.toThrow("timeout de Supabase");
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

    await expect(procesarWebhook({ cuerpo: sobreDeAnuncio(), deps })).resolves.toEqual({ procesados: 1 });
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
          // Campos de la secuencia (tarea 5): sin uso en este test, se dejan en
          // su estado "todavía no ha empezado".
          secuencia_id: null,
          paso_actual: null,
          datos: {},
          reanudar_en: null,
        };
        conversaciones.set(`${input.marcaId}:${input.waId}`, conv);
        throw new Error("duplicate key value violates unique constraint");
      }
      return crearConversacionOriginal(input);
    };

    const resultado = await procesarWebhook({ cuerpo: sobreDeAnuncio(), deps });

    expect(resultado).toEqual({ procesados: 1 });
    expect(leadsPorTelefono.size).toBe(1);
    const conv = conversaciones.get(`${MARCA.id}:34660415514`);
    expect(conv?.id).toBe("conv-ganadora");
    expect(conv?.lead_id).toBeTruthy();
  });

  // Hallazgo I1 (Important) de la ronda de arreglos 2: la ventana nunca se
  // encoge. Secuencia exacta del hallazgo: mensaje de anuncio en T (ventana a
  // T+72h), luego una respuesta en T+2h que ya NO trae `referral` (se
  // recalcularía a T+26h sin el arreglo). La ventana debe seguir siendo la
  // de 72h ganada por el anuncio.
  it("la ventana no se encoge: una respuesta sin referral no reduce la ventana de 72h ganada por el anuncio", async () => {
    const { deps, conversaciones } = depsFalsas();
    const inicioSegundos = 1790000000;

    const cuerpoAnuncio = sobreConMensajes([mensajeDeAnuncio({ timestamp: String(inicioSegundos) })]);
    await procesarWebhook({ cuerpo: cuerpoAnuncio, deps });

    const trasAnuncio = conversaciones.get(`${MARCA.id}:34660415514`);
    const ventanaTrasAnuncio = new Date(trasAnuncio!.ventana_hasta!).getTime();
    expect(ventanaTrasAnuncio).toBe((inicioSegundos + 72 * 60 * 60) * 1000);
    // Copia por valor ANTES del segundo webhook: `actualizarConversacion` de
    // `depsFalsas()` muta el objeto almacenado EN SITIO, así que
    // `conversaciones.get(...)` tras la segunda llamada devolvería la MISMA
    // referencia que `trasAnuncio`. Comparar contra esa referencia mutada
    // haría que la aserción de más abajo compare un campo consigo mismo y
    // pase siempre, sin vigilar nada. `esperado` congela el string tal como
    // quedó tras el anuncio.
    const esperado = trasAnuncio!.ventana_hasta;

    // Respuesta 2h más tarde, sin referral: la conversación está en "bot" y
    // trae texto, así que decidir() la clasifica como "guardar_respuesta".
    const cuerpoRespuesta = sobreConMensajes([
      {
        id: "wamid.RESPUESTA_SIN_REFERRAL",
        from: "34660415514",
        timestamp: String(inicioSegundos + 2 * 60 * 60),
        type: "text",
        text: { body: "Tengo un gimnasio" },
      },
    ]);
    await procesarWebhook({ cuerpo: cuerpoRespuesta, deps });

    const trasRespuesta = conversaciones.get(`${MARCA.id}:34660415514`);
    expect(trasRespuesta?.estado).toBe("humana");
    expect(trasRespuesta?.ventana_hasta).toBe(esperado);
  });

  /* Tarea 7: arrancar la secuencia con un lead de anuncio ------------------ */

  it("arranca la secuencia que sirve al anuncio y manda su primer paso", async () => {
    const { deps, salientes, conversaciones, enviosMensajero } = depsFalsas({
      secuencias: [{ id: "s1", estado: "activa", anuncios: ["AD1"], pasos: SECUENCIA_MINIMA }],
    });

    await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });

    expect(salientes[0].texto).toContain("¿Qué te pasa?");
    const conv = [...conversaciones.values()][0];
    expect(conv.secuencia_id).toBe("s1");
    expect(conv.paso_actual).toBe("problemas");
    // Hallazgo 3 (ronda de arreglos 1): un paso CON botones se manda con
    // `enviarBotones`, con los mismos rótulos que declara el paso — no con
    // `enviarTexto`, que perdería los botones sin que ningún test lo notara.
    expect(enviosMensajero).toHaveLength(1);
    expect(enviosMensajero[0].metodo).toBe("botones");
    expect(enviosMensajero[0].opciones).toEqual(["Faltan pacientes", "No vuelven", "Boca a boca"]);
  });

  it("cae en la autorespuesta en código si ninguna secuencia sirve", async () => {
    // Nunca mudo: si alguien archiva la secuencia, el lead sigue recibiendo algo.
    const { deps, salientes } = depsFalsas({ secuencias: [] });

    await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });

    expect(salientes[0].texto).toContain("Escala");
  });

  it("una variable sin valor deja el hueco visible y sigue", async () => {
    // El lead de WhatsApp no trae ciudad. El mensaje debe salir igual.
    const { deps, salientes, enviosMensajero } = depsFalsas({
      secuencias: [{ id: "s1", estado: "activa", anuncios: [], pasos: SECUENCIA_CON_CIUDAD }],
    });

    await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });

    expect(salientes).toHaveLength(1);
    expect(salientes[0].texto).toContain("{{ciudad}}");
    // Hallazgo 3 (ronda de arreglos 1): la otra mitad de la decisión — un
    // paso SIN botones se manda con `enviarTexto`, no con `enviarBotones`.
    expect(enviosMensajero[0].metodo).toBe("texto");
  });

  // Hallazgo 1 (Important, ronda de arreglos 1): el contexto del motor debe
  // llevar los datos del lead cuando existen, no solo marca/remitente — si
  // no, `{{contacto}}` saldría en blanco para siempre incluso para un lead
  // que ya tiene su nombre en la base.
  it("un lead con contacto conocido renderiza su nombre en vez del hueco", async () => {
    const { deps, leadsPorTelefono, salientes } = depsFalsas({
      secuencias: [{ id: "s1", estado: "activa", anuncios: [], pasos: SECUENCIA_CON_CONTACTO }],
    });
    leadsPorTelefono.set("660415514", { id: "lead-conocido", contacto: "Ana" });

    await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });

    expect(salientes[0].texto).toBe("Hola Ana");
    expect(salientes[0].texto).not.toContain("{{contacto}}");
  });

  // Hallazgo 2 (Important, ronda de arreglos 1): si el mensaje SÍ se envía
  // pero guardar dónde quedó la secuencia falla, `paso_actual` se queda en
  // null — que es exactamente "secuencia terminada" — y la idempotencia por
  // wamid impide que un reintento de Meta lo repare nunca. La conversación
  // debe pasar a `humana` para que se note en la bandeja, no desaparecer.
  it("si falla guardar el estado de la secuencia tras enviar, la conversación pasa a humana", async () => {
    const { deps, conversaciones, salientes } = depsFalsas({
      secuencias: [{ id: "s1", estado: "activa", anuncios: ["AD1"], pasos: SECUENCIA_MINIMA }],
    });
    const actualizarConversacionOriginal = deps.actualizarConversacion;
    deps.actualizarConversacion = async (id, cambios) => {
      // Solo falla el guardado DEL ESTADO DE LA SECUENCIA (trae
      // `secuenciaId`); las demás llamadas (crear el lead, y el intento de
      // recuperación que pasa a `humana`) usan el doble real.
      if (cambios.secuenciaId !== undefined) throw new Error("fallo guardando el estado de la secuencia");
      return actualizarConversacionOriginal(id, cambios);
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps })).resolves.toEqual({ procesados: 1 });

    // El mensaje sí se mandó y se guardó: eso no se deshace.
    expect(salientes).toHaveLength(1);
    const conv = [...conversaciones.values()][0];
    expect(conv.secuencia_id).toBeNull();
    expect(conv.estado).toBe("humana");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  /* Tarea 8: la respuesta del lead avanza la secuencia --------------------- */

  it("el botón pulsado lleva a su rama", async () => {
    const { deps, salientes } = depsFalsas({ secuencias: [SECUENCIA_ACTIVA] });

    await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });
    await procesarWebhook({ cuerpo: sobrePulsacion("opcion_2", "Vienen 1 vez y ya"), deps });

    expect(salientes[1].texto).toContain("cierre dos");
  });

  it("un reintento de Meta no avanza la secuencia dos veces", async () => {
    const { deps, salientes } = depsFalsas({ secuencias: [SECUENCIA_ACTIVA] });

    await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });
    const pulsacion = sobrePulsacion("opcion_2", "Vienen 1 vez y ya");
    await procesarWebhook({ cuerpo: pulsacion, deps });
    await procesarWebhook({ cuerpo: pulsacion, deps });

    expect(salientes).toHaveLength(2);
  });

  it("texto libre con botones delante para la secuencia y avisa", async () => {
    const { deps, conversaciones, actividades } = depsFalsas({ secuencias: [SECUENCIA_ACTIVA] });

    await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });
    await procesarWebhook({ cuerpo: sobreTexto("prefiero que me llaméis"), deps });

    const conv = [...conversaciones.values()][0];
    expect(conv.estado).toBe("humana");
    expect(actividades.some((a) => a.nota.includes("Avisar"))).toBe(true);
  });

  it("si el paso guardado ya no existe, termina con aviso en vez de romper", async () => {
    // Pasa cuando alguien edita la secuencia con conversaciones en vuelo.
    const { deps, conversaciones, secuencias } = depsFalsas({ secuencias: [SECUENCIA_ACTIVA] });

    await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });
    secuencias[0].pasos = SECUENCIA_SIN_ESE_PASO;

    await expect(
      procesarWebhook({ cuerpo: sobrePulsacion("opcion_1", "Huecos en la agenda"), deps }),
    ).resolves.toBeDefined();
    expect([...conversaciones.values()][0].estado).toBe("humana");
  });

  /* Ronda de arreglos 1 de la tarea 8 ---------------------------------------- */

  // Hallazgo 1 (Critical): un botón fuera de rango (la secuencia se editó
  // con menos botones que los que el lead tiene delante) dejaba la
  // conversación en "bot" para siempre, sin mensaje, sin aviso y sin ni un
  // log — el lead se quedaba esperando una respuesta que no iba a llegar.
  it("un botón fuera de rango pasa a humana y avisa en la ficha, no deja la conversación muda", async () => {
    const { deps, conversaciones, secuencias, actividades } = depsFalsas({ secuencias: [SECUENCIA_ACTIVA] });

    await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });
    // La secuencia se edita con menos botones mientras la conversación sigue
    // en vuelo: el lead tiene delante un mensaje con dos botones, pero ahora
    // el paso solo tiene uno.
    secuencias[0].pasos = SECUENCIA_MENOS_BOTONES;

    await expect(
      procesarWebhook({ cuerpo: sobrePulsacion("opcion_2", "Vienen 1 vez y ya"), deps }),
    ).resolves.toBeDefined();

    expect([...conversaciones.values()][0].estado).toBe("humana");
    expect(actividades.some((a) => a.nota.includes("Avisar"))).toBe(true);
  });

  // Hallazgo 2 (Important): cuando no hay nada que avanzar porque la
  // secuencia ya no existe o no parsea, antes solo quedaba un
  // `console.error` — la comercial abría la ficha sin saber qué había
  // pasado. Ahora tiene que quedar una nota.
  it("si la secuencia ya no está entre las de la marca, pasa a humana y deja el motivo en la ficha", async () => {
    const { deps, conversaciones, secuencias, actividades } = depsFalsas({ secuencias: [SECUENCIA_ACTIVA] });

    await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });
    // La fila desaparece de la lista de secuencias de la marca (borrada),
    // como si `listSecuencias` ya no la trajera.
    secuencias.length = 0;

    await expect(
      procesarWebhook({ cuerpo: sobrePulsacion("opcion_1", "Vienen bastante"), deps }),
    ).resolves.toBeDefined();

    expect([...conversaciones.values()][0].estado).toBe("humana");
    expect(actividades.some((a) => a.nota.includes("Avisar"))).toBe(true);
  });

  it("si la secuencia guardada no parsea, pasa a humana y deja el motivo en la ficha", async () => {
    const { deps, conversaciones, secuencias, actividades } = depsFalsas({ secuencias: [SECUENCIA_ACTIVA] });

    await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });
    // Forma inválida: le falta "pasos". `parsearSecuencia` la rechaza.
    secuencias[0].pasos = { version: 1, inicio: "inicio" };

    await expect(
      procesarWebhook({ cuerpo: sobrePulsacion("opcion_1", "Vienen bastante"), deps }),
    ).resolves.toBeDefined();

    expect([...conversaciones.values()][0].estado).toBe("humana");
    expect(actividades.some((a) => a.nota.includes("Avisar"))).toBe(true);
  });
});
