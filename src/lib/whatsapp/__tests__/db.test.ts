import { describe, expect, it, vi, beforeEach } from "vitest";

// Corrección al brief: en supabase-js v2 `onConflict`/`ignoreDuplicates` solo
// existen en `.upsert()`; con `.insert()` se ignorarían en silencio y un
// reintento de Meta reventaría por el índice único de `wamid`.
const upsertMock = vi.fn();
const insertMock = vi.fn();
// El doble de `ventas_conversaciones.update(...).eq(...)`, para comprobar que
// guardarEntrante/guardarSaliente actualizan (o no) el resumen desnormalizado.
const actualizarConversacionMock = vi.fn();
// El `.lt(...)` encadenado tras ese `.eq(...)` (lo usa guardarEco): recibe la
// columna, el valor y el resultado del update al que filtra.
const ltMock = vi.fn((_col: string, _valor: string, r: unknown) => r);
// `ventas_conversaciones.insert(...).select("*").single()`, para crearConversacion.
const insertConversacionMock = vi.fn();
// El `.lte(...)` que usa guardarHistorial para no mover el resumen hacia atrás.
const lteMock = vi.fn((_col: string, _valor: string, r: unknown) => r);
// `ventas_whatsapp_contactos`: upsert de guardarContactos y lectura de nombreDeContacto.
const upsertContactosMock = vi.fn();
const leerContactoMock = vi.fn();
// `ventas_mensajes.select(cols).eq(...).order(...)`, para listMensajes.
const listarMensajesMock = vi.fn();

vi.mock("../../supabase-admin", () => ({
  // `db()` exige un cliente no nulo; el doble simula Supabase ya configurado.
  getSupabaseAdmin: () => ({
    from: (tabla: string) => {
      if (tabla === "ventas_mensajes") {
        return {
          upsert: upsertMock,
          insert: insertMock,
          select: (cols: string) => ({ eq: () => ({ order: () => listarMensajesMock(cols) }) }),
        };
      }
      if (tabla === "ventas_conversaciones") {
        return {
          update: (patch: unknown) => ({
            eq: (_col: string, id: string) => {
              const r = actualizarConversacionMock(patch, id);
              return {
                ...r,
                lt: (col: string, valor: string) => ltMock(col, valor, r),
                lte: (col: string, valor: string) => lteMock(col, valor, r),
              };
            },
          }),
          insert: (fila: unknown) => ({ select: () => ({ single: () => insertConversacionMock(fila) }) }),
        };
      }
      if (tabla === "ventas_whatsapp_contactos") {
        return {
          upsert: upsertContactosMock,
          select: () => ({
            eq: (_c1: string, marcaId: string) => ({
              eq: (_c2: string, waId: string) => ({ maybeSingle: () => leerContactoMock(marcaId, waId) }),
            }),
          }),
        };
      }
      throw new Error(`tabla inesperada en el test: ${tabla}`);
    },
  }),
}));

import {
  actualizarConversacion,
  crearConversacion,
  guardarContactos,
  guardarEco,
  guardarEntrante,
  guardarHistorial,
  guardarSaliente,
  listMensajes,
  nombreDeContacto,
} from "../db";

beforeEach(() => {
  upsertMock.mockReset();
  insertMock.mockReset().mockReturnValue({ error: null });
  actualizarConversacionMock.mockReset().mockReturnValue({ error: null });
  ltMock.mockClear();
  lteMock.mockClear();
  upsertContactosMock.mockReset().mockReturnValue({ error: null });
  leerContactoMock.mockReset().mockReturnValue({ data: null, error: null });
  listarMensajesMock.mockReset();
  insertConversacionMock.mockReset().mockImplementation((fila: Record<string, unknown>) => ({ data: { id: "c1", ...fila }, error: null }));
});

describe("guardarEntrante", () => {
  it("dice que es nuevo y actualiza el resumen de la conversación cuando la fila se inserta", async () => {
    upsertMock.mockReturnValue({ select: () => ({ data: [{ id: "m1" }], error: null }) });
    expect(await guardarEntrante({ conversacionId: "c1", wamid: "w1", texto: "hola", payload: {} })).toEqual({
      nuevo: true,
    });
    expect(actualizarConversacionMock).toHaveBeenCalledTimes(1);
    const [patch, id] = actualizarConversacionMock.mock.calls[0];
    expect(id).toBe("c1");
    expect(patch).toMatchObject({ ultimo_texto: "hola" });
  });

  // Review Focus 2: el reintento de Meta no debe producir una segunda respuesta
  // NI reescribir el resumen de la conversación con el mismo mensaje que ya
  // estaba — eso es justo la señal que otra capa usaría para pensar que hay
  // algo nuevo a lo que responder.
  it("dice que no es nuevo y NO toca la conversación si el wamid ya estaba", async () => {
    upsertMock.mockReturnValue({ select: () => ({ data: [], error: null }) });
    expect(await guardarEntrante({ conversacionId: "c1", wamid: "w1", texto: "hola", payload: {} })).toEqual({
      nuevo: false,
    });
    expect(actualizarConversacionMock).not.toHaveBeenCalled();
  });

  // El update del resumen es best-effort: el mensaje ya se guardó arriba, así
  // que un fallo del update de la conversación no debe tumbar la petición
  // (el webhook necesita su 200 pase lo que pase con este extracto).
  it("no lanza si falla el update del resumen de la conversación, solo lo registra", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    upsertMock.mockReturnValue({ select: () => ({ data: [{ id: "m1" }], error: null }) });
    actualizarConversacionMock.mockReturnValue({ error: { message: "boom" } });

    await expect(
      guardarEntrante({ conversacionId: "c1", wamid: "w1", texto: "hola", payload: {} }),
    ).resolves.toEqual({ nuevo: true });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("guardarEco", () => {
  const eco = {
    conversacionId: "c1",
    wamid: "wamid.E",
    texto: "Te llamo ahora",
    enviadoEn: new Date(1790000000 * 1000),
    payload: { id: "wamid.E" },
  };

  // Meta reintenta también los ecos: el mismo wamid no puede entrar dos veces.
  it("hace upsert por wamid como saliente del móvil con la hora en que se envió", async () => {
    upsertMock.mockReturnValue({ select: () => ({ data: [{ id: "m1" }], error: null }) });
    expect(await guardarEco(eco)).toEqual({ nuevo: true });

    const [fila, opciones] = upsertMock.mock.calls[0];
    expect(opciones).toEqual({ onConflict: "wamid", ignoreDuplicates: true });
    expect(fila).toEqual({
      conversacion_id: "c1",
      direccion: "saliente",
      wamid: "wamid.E",
      texto: "Te llamo ahora",
      payload: { id: "wamid.E" },
      estado: "enviado",
      origen: "movil",
      created_at: "2026-09-21T14:13:20.000Z",
    });
    const [patch, id] = actualizarConversacionMock.mock.calls[0];
    expect(id).toBe("c1");
    expect(patch).toEqual({ ultimo_texto: "Te llamo ahora", ultimo_mensaje_at: "2026-09-21T14:13:20.000Z" });
  });

  // Un eco viejo procesado después de un entrante más nuevo no puede devolver
  // el resumen de la bandeja hacia atrás: el update solo toca la fila si lo que
  // tiene es anterior al eco.
  it("solo actualiza el resumen si el eco es más reciente que el último mensaje", async () => {
    upsertMock.mockReturnValue({ select: () => ({ data: [{ id: "m1" }], error: null }) });
    await guardarEco(eco);
    expect(ltMock).toHaveBeenCalledTimes(1);
    expect(ltMock.mock.calls[0].slice(0, 2)).toEqual(["ultimo_mensaje_at", "2026-09-21T14:13:20.000Z"]);
  });

  it("un eco repetido dice que no es nuevo y no toca la conversación", async () => {
    upsertMock.mockReturnValue({ select: () => ({ data: [], error: null }) });
    expect(await guardarEco(eco)).toEqual({ nuevo: false });
    expect(actualizarConversacionMock).not.toHaveBeenCalled();
  });

  it("repite sin origen si falta la columna", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    upsertMock
      .mockReturnValueOnce({ select: () => ({ data: null, error: { code: "PGRST204", message: "sin origen" } }) })
      .mockReturnValueOnce({ select: () => ({ data: [{ id: "m1" }], error: null }) });

    expect(await guardarEco(eco)).toEqual({ nuevo: true });
    expect(upsertMock.mock.calls[1][0]).not.toHaveProperty("origen");
    errorSpy.mockRestore();
  });
});

describe("guardarSaliente", () => {
  it("inserta el saliente y actualiza el resumen de la conversación", async () => {
    await guardarSaliente({ conversacionId: "c1", wamid: "w-out", texto: "hola" });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(actualizarConversacionMock).toHaveBeenCalledTimes(1);
    const [patch, id] = actualizarConversacionMock.mock.calls[0];
    expect(id).toBe("c1");
    expect(patch).toMatchObject({ ultimo_texto: "hola" });
  });

  it("guarda los botones que se mandaron, para que la bandeja los enseñe", async () => {
    await guardarSaliente({ conversacionId: "c1", wamid: "w-out", texto: "hola", botones: ["Sí", "No"] });
    expect(insertMock.mock.calls[0][0]).toMatchObject({ payload: { botones: ["Sí", "No"] } });
  });

  it("sin botones no escribe payload", async () => {
    await guardarSaliente({ conversacionId: "c1", wamid: "w-out", texto: "hola" });
    expect(insertMock.mock.calls[0][0]).not.toHaveProperty("payload");
  });

  // Mismo criterio best-effort que guardarEntrante: el saliente ya está
  // guardado, así que un fallo al refrescar el resumen no debe lanzar.
  it("no lanza si falla el update del resumen de la conversación, solo lo registra", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    actualizarConversacionMock.mockReturnValue({ error: { message: "boom" } });

    await expect(
      guardarSaliente({ conversacionId: "c1", wamid: "w-out", texto: "hola" }),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("actualizarConversacion", () => {
  // Reutiliza el mismo doble `actualizarConversacionMock` de más arriba: es
  // el `update(...).eq(...)` de `ventas_conversaciones`, y `actualizarConversacion`
  // pasa por esa misma llamada.
  it("guarda el avance de la secuencia sin pisar el resto", async () => {
    actualizarConversacionMock.mockReturnValue({ error: null });
    await actualizarConversacion("c1", { pasoActual: "cierre_huecos", datos: { problema_principal: "Huecos" } });
    const [patch] = actualizarConversacionMock.mock.calls[0];
    expect(patch).toEqual({ paso_actual: "cierre_huecos", datos: { problema_principal: "Huecos" } });
  });

  it("distingue «no tocar» de «poner a null» en el paso", async () => {
    // Terminar una conversación es poner `paso_actual` a null a propósito; no
    // puede confundirse con «este cambio no toca el paso».
    actualizarConversacionMock.mockReturnValue({ error: null });
    await actualizarConversacion("c1", { pasoActual: null });
    expect(actualizarConversacionMock.mock.calls[0][0]).toEqual({ paso_actual: null });
  });

  // `secuenciaId` y `reanudarEn` pasan por el mismo patrón «la clave llegó»
  // que `pasoActual`, pero con su propio riesgo: un chequeo falsy sobre
  // `secuenciaId` trataría `null` como «no venía», y `secuencia_id: null` es
  // un valor legítimo («esta conversación ya no sigue ningún guion»). Sin un
  // test que fije el `null` explícito, ese fallo pasaría desapercibido.
  it("guarda el id de la secuencia, incluido a propósito a null", async () => {
    actualizarConversacionMock.mockReturnValue({ error: null });
    await actualizarConversacion("c1", { secuenciaId: "s1" });
    expect(actualizarConversacionMock.mock.calls[0][0]).toEqual({ secuencia_id: "s1" });

    actualizarConversacionMock.mockClear().mockReturnValue({ error: null });
    // Desvincular la secuencia (p.ej. al terminarla) es tan real como
    // asignarla: si se confundiera con «no tocar», la conversación se
    // quedaría enganchada a un guion que ya no le corresponde sin que nadie
    // lo note.
    await actualizarConversacion("c1", { secuenciaId: null });
    expect(actualizarConversacionMock.mock.calls[0][0]).toEqual({ secuencia_id: null });
  });

  // Igual que con `pasoActual`/`secuenciaId`: `reanudarEn: null` es «ya no
  // hay que esperar» (se limpia la marca de espera), no «no toques este
  // campo». Se comprueba también la conversión a ISO, que es lo único no
  // trivial de este campo.
  it("convierte reanudarEn a ISO, incluido a propósito a null", async () => {
    actualizarConversacionMock.mockReturnValue({ error: null });
    await actualizarConversacion("c1", { reanudarEn: new Date("2026-10-01T09:00:00Z") });
    expect(actualizarConversacionMock.mock.calls[0][0]).toEqual({ reanudar_en: "2026-10-01T09:00:00.000Z" });

    actualizarConversacionMock.mockClear().mockReturnValue({ error: null });
    await actualizarConversacion("c1", { reanudarEn: null });
    expect(actualizarConversacionMock.mock.calls[0][0]).toEqual({ reanudar_en: null });
  });
});

// Las columnas nuevas de la coexistencia (`ventas_mensajes.origen` y
// `ventas_conversaciones.nombre_contacto`) dependen de una migración MANUAL:
// hasta que alguien la ejecute, la escritura se repite sin ellas en vez de
// tumbar el webhook de Dinkbit.
describe("columnas nuevas sin la migración", () => {
  // El aviso en consola sale una vez por proceso: lo comprueba
  // «aviso de migración pendiente en escrituras». Aquí solo se silencia.
  const faltaColumna = { message: "Could not find the 'origen' column", code: "PGRST204" };

  it("guardarEntrante escribe el origen cuando la columna existe", async () => {
    upsertMock.mockReturnValue({ select: () => ({ data: [{ id: "m1" }], error: null }) });
    await guardarEntrante({ conversacionId: "c1", wamid: "w1", texto: "hola", payload: {}, origen: "cliente" });
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock.mock.calls[0][0]).toMatchObject({ origen: "cliente" });
  });

  it("guardarEntrante repite sin origen si falta la columna", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    upsertMock
      .mockReturnValueOnce({ select: () => ({ data: null, error: faltaColumna }) })
      .mockReturnValueOnce({ select: () => ({ data: [{ id: "m1" }], error: null }) });

    await expect(
      guardarEntrante({ conversacionId: "c1", wamid: "w1", texto: "hola", payload: {}, origen: "cliente" }),
    ).resolves.toEqual({ nuevo: true });
    expect(upsertMock).toHaveBeenCalledTimes(2);
    expect(upsertMock.mock.calls[1][0]).not.toHaveProperty("origen");
    errorSpy.mockRestore();
  });

  it("guardarEntrante no repite por otros errores", async () => {
    upsertMock.mockReturnValue({ select: () => ({ data: null, error: { message: "timeout", code: "57014" } }) });
    await expect(
      guardarEntrante({ conversacionId: "c1", wamid: "w1", texto: "hola", payload: {}, origen: "cliente" }),
    ).rejects.toThrow("timeout");
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  it("guardarSaliente repite sin origen si falta la columna", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    insertMock.mockReturnValueOnce({ error: faltaColumna }).mockReturnValueOnce({ error: null });

    await guardarSaliente({ conversacionId: "c1", wamid: "w-out", texto: "hola", origen: "bot" });

    expect(insertMock.mock.calls[0][0]).toMatchObject({ origen: "bot" });
    expect(insertMock.mock.calls[1][0]).not.toHaveProperty("origen");
    expect(insertMock.mock.calls[1][0]).toMatchObject({ texto: "hola", direccion: "saliente" });
    errorSpy.mockRestore();
  });

  it("sin origen no escribe la columna", async () => {
    await guardarSaliente({ conversacionId: "c1", wamid: "w-out", texto: "hola" });
    expect(insertMock.mock.calls[0][0]).not.toHaveProperty("origen");
  });

  it("crearConversacion guarda el nombre del contacto y lo omite si falta la columna", async () => {
    await crearConversacion({ marcaId: "m1", waId: "34600", leadId: null, estado: "humana", ventanaHasta: new Date(0), nombreContacto: "Ana" });
    expect(insertConversacionMock.mock.calls[0][0]).toMatchObject({ nombre_contacto: "Ana" });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    insertConversacionMock.mockReset();
    insertConversacionMock
      .mockReturnValueOnce({ data: null, error: { message: "column nombre_contacto does not exist", code: "42703" } })
      .mockImplementationOnce((fila: Record<string, unknown>) => ({ data: { id: "c2", ...fila }, error: null }));

    const conv = await crearConversacion({
      marcaId: "m1",
      waId: "34600",
      leadId: null,
      estado: "humana",
      ventanaHasta: new Date(0),
      nombreContacto: "Ana",
    });
    expect(conv.id).toBe("c2");
    expect(insertConversacionMock.mock.calls[1][0]).not.toHaveProperty("nombre_contacto");
    errorSpy.mockRestore();
  });

  it("actualizarConversacion repite sin el nombre si falta la columna, y no escribe nada si solo traía el nombre", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    actualizarConversacionMock.mockReturnValueOnce({ error: faltaColumna }).mockReturnValueOnce({ error: null });
    await actualizarConversacion("c1", { estado: "humana", nombreContacto: "Ana" });
    expect(actualizarConversacionMock.mock.calls[0][0]).toEqual({ estado: "humana", nombre_contacto: "Ana" });
    expect(actualizarConversacionMock.mock.calls[1][0]).toEqual({ estado: "humana" });

    actualizarConversacionMock.mockReset().mockReturnValueOnce({ error: faltaColumna });
    await expect(actualizarConversacion("c1", { nombreContacto: "Ana" })).resolves.toBeUndefined();
    expect(actualizarConversacionMock).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});

describe("crearConversacion para el historial", () => {
  // Una conversación importada no tiene ventana abierta, y nace con la hora de
  // su mensaje más antiguo para que guardarHistorial pueda subirla al último.
  it("acepta ventana null y la hora del último mensaje", async () => {
    const desde = new Date(1790000000 * 1000);
    await crearConversacion({ marcaId: "m1", waId: "34600", leadId: null, estado: "humana", ventanaHasta: null, ultimoMensajeAt: desde });
    expect(insertConversacionMock.mock.calls[0][0]).toMatchObject({ ventana_hasta: null, ultimo_mensaje_at: desde.toISOString() });
  });
});

describe("guardarHistorial", () => {
  const H1 = new Date(1790000000 * 1000);
  const H2 = new Date(1790000100 * 1000);
  const lote = {
    conversacionId: "c1",
    mensajes: [
      { wamid: "wamid.H1", deNegocio: false, texto: "hola", enviadoEn: H1, crudo: { id: "wamid.H1" } },
      { wamid: "wamid.H2", deNegocio: true, texto: "qué tal", enviadoEn: H2, crudo: { id: "wamid.H2" } },
    ],
  };

  it("un solo upsert por wamid, con dirección según quién lo envió, origen historial y su hora real", async () => {
    upsertMock.mockReturnValue({ select: () => ({ data: [{ wamid: "wamid.H1" }, { wamid: "wamid.H2" }], error: null }) });
    expect(await guardarHistorial(lote)).toBe(2);

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [filas, opciones] = upsertMock.mock.calls[0];
    expect(opciones).toEqual({ onConflict: "wamid", ignoreDuplicates: true });
    expect(filas).toEqual([
      {
        conversacion_id: "c1",
        direccion: "entrante",
        wamid: "wamid.H1",
        texto: "hola",
        payload: { id: "wamid.H1" },
        estado: "entregado",
        created_at: H1.toISOString(),
        origen: "historial",
      },
      {
        conversacion_id: "c1",
        direccion: "saliente",
        wamid: "wamid.H2",
        texto: "qué tal",
        payload: { id: "wamid.H2" },
        estado: "enviado",
        created_at: H2.toISOString(),
        origen: "historial",
      },
    ]);
    // El resumen pasa al último importado, solo si no hay nada más reciente.
    expect(actualizarConversacionMock).toHaveBeenCalledWith({ ultimo_texto: "qué tal", ultimo_mensaje_at: H2.toISOString() }, "c1");
    expect(lteMock).toHaveBeenCalledWith("ultimo_mensaje_at", H2.toISOString(), expect.anything());
  });

  it("si todos los wamid ya estaban (eco o reintento) devuelve 0 y no toca la conversación", async () => {
    upsertMock.mockReturnValue({ select: () => ({ data: [], error: null }) });
    expect(await guardarHistorial(lote)).toBe(0);
    expect(actualizarConversacionMock).not.toHaveBeenCalled();
  });

  it("el resumen sale del más reciente de los que sí se insertaron", async () => {
    upsertMock.mockReturnValue({ select: () => ({ data: [{ wamid: "wamid.H1" }], error: null }) });
    expect(await guardarHistorial(lote)).toBe(1);
    expect(actualizarConversacionMock).toHaveBeenCalledWith({ ultimo_texto: "hola", ultimo_mensaje_at: H1.toISOString() }, "c1");
  });

  it("sin mensajes no escribe nada", async () => {
    expect(await guardarHistorial({ conversacionId: "c1", mensajes: [] })).toBe(0);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("si falta la columna origen repite el upsert sin ella", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    upsertMock
      .mockReturnValueOnce({ select: () => ({ data: null, error: { message: "no origen", code: "PGRST204" } }) })
      .mockReturnValueOnce({ select: () => ({ data: [{ wamid: "wamid.H1" }], error: null }) });
    expect(await guardarHistorial(lote)).toBe(1);
    expect(upsertMock.mock.calls[1][0][0]).not.toHaveProperty("origen");
    errorSpy.mockRestore();
  });

  it("lanza si falla el upsert por otra razón", async () => {
    upsertMock.mockReturnValue({ select: () => ({ data: null, error: { message: "boom" } }) });
    await expect(guardarHistorial(lote)).rejects.toThrow("boom");
  });
});

describe("contactos", () => {
  it("guardarContactos hace upsert por marca y wa_id", async () => {
    await guardarContactos("m1", [{ waId: "34600112233", nombre: "Ana Pérez" }]);
    const [filas, opciones] = upsertContactosMock.mock.calls[0];
    expect(opciones).toEqual({ onConflict: "marca_id,wa_id" });
    expect(filas).toEqual([
      { marca_id: "m1", wa_id: "34600112233", nombre: "Ana Pérez", actualizado_en: expect.any(String) },
    ]);
  });

  it("guardarContactos sin la tabla (migración pendiente) no lanza", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    upsertContactosMock.mockReturnValue({ error: { message: "no existe", code: "42P01" } });
    await expect(guardarContactos("m1", [{ waId: "1", nombre: "A" }])).resolves.toBeUndefined();
    errorSpy.mockRestore();
  });

  it("guardarContactos lanza con otros fallos", async () => {
    upsertContactosMock.mockReturnValue({ error: { message: "boom" } });
    await expect(guardarContactos("m1", [{ waId: "1", nombre: "A" }])).rejects.toThrow("boom");
  });

  it("nombreDeContacto devuelve el nombre guardado, o null sin la tabla", async () => {
    leerContactoMock.mockReturnValueOnce({ data: { nombre: "Ana" }, error: null });
    expect(await nombreDeContacto("m1", "34600112233")).toBe("Ana");
    expect(leerContactoMock).toHaveBeenCalledWith("m1", "34600112233");

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    leerContactoMock.mockReturnValueOnce({ data: null, error: { message: "no existe", code: "42P01" } });
    expect(await nombreDeContacto("m1", "1")).toBeNull();
    errorSpy.mockRestore();
  });
});

describe("aviso de migración pendiente en escrituras", () => {
  it("se registra una sola vez por proceso aunque haya muchas escrituras degradadas", async () => {
    // Módulo recién cargado: el aviso de otros tests de este archivo no cuenta.
    vi.resetModules();
    const fresco = await import("../db");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const faltaColumna = { message: "Could not find the 'origen' column", code: "PGRST204" };
    insertMock.mockReturnValue({ error: null });
    insertMock.mockReturnValueOnce({ error: faltaColumna });
    await fresco.guardarSaliente({ conversacionId: "c1", wamid: "w1", texto: "hola", origen: "bot" });
    insertMock.mockReturnValueOnce({ error: faltaColumna });
    await fresco.guardarSaliente({ conversacionId: "c1", wamid: "w2", texto: "otra", origen: "panel" });
    actualizarConversacionMock.mockReturnValueOnce({ error: faltaColumna });
    await fresco.actualizarConversacion("c1", { estado: "humana", nombreContacto: "Ana" });

    const avisos = errorSpy.mock.calls.filter((c) => String(c[0]).includes("falta ejecutar la migración"));
    errorSpy.mockRestore();
    expect(avisos).toHaveLength(1);
    // Y las escrituras se repitieron igualmente sin las columnas nuevas.
    expect(insertMock.mock.calls[1][0]).not.toHaveProperty("origen");
    expect(insertMock.mock.calls[3][0]).not.toHaveProperty("origen");
    expect(actualizarConversacionMock.mock.calls.at(-1)?.[0]).toEqual({ estado: "humana" });
  });
});

describe("listMensajes", () => {
  it("pide y devuelve el origen de cada mensaje", async () => {
    listarMensajesMock.mockReturnValueOnce({ data: [{ id: "m1", origen: "movil" }], error: null });
    expect(await listMensajes("c1")).toEqual([{ id: "m1", origen: "movil" }]);
    expect(listarMensajesMock.mock.calls[0][0]).toContain("origen");
  });

  it("si falta la columna origen reintenta sin ella y avisa una sola vez", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const faltante = { data: null, error: { message: "column origen does not exist", code: "42703" } };
    listarMensajesMock.mockReturnValueOnce(faltante).mockReturnValueOnce({ data: [{ id: "m1" }], error: null });
    expect(await listMensajes("c1")).toEqual([{ id: "m1" }]);
    expect(listarMensajesMock.mock.calls[1][0]).not.toContain("origen");
    expect(errorSpy).toHaveBeenCalledTimes(1);

    listarMensajesMock.mockReturnValueOnce(faltante).mockReturnValueOnce({ data: [], error: null });
    await listMensajes("c1");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it("otros errores se propagan", async () => {
    listarMensajesMock.mockReturnValueOnce({ data: null, error: { message: "caído", code: "XX000" } });
    await expect(listMensajes("c1")).rejects.toThrow("caído");
  });
});
