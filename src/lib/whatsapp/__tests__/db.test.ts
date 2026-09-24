import { describe, expect, it, vi, beforeEach } from "vitest";

// Corrección al brief: en supabase-js v2 `onConflict`/`ignoreDuplicates` solo
// existen en `.upsert()`; con `.insert()` se ignorarían en silencio y un
// reintento de Meta reventaría por el índice único de `wamid`.
const upsertMock = vi.fn();
const insertMock = vi.fn();
// El doble de `ventas_conversaciones.update(...).eq(...)`, para comprobar que
// guardarEntrante/guardarSaliente actualizan (o no) el resumen desnormalizado.
const actualizarConversacionMock = vi.fn();

vi.mock("../../supabase-admin", () => ({
  // `db()` exige un cliente no nulo; el doble simula Supabase ya configurado.
  getSupabaseAdmin: () => ({
    from: (tabla: string) => {
      if (tabla === "ventas_mensajes") return { upsert: upsertMock, insert: insertMock };
      if (tabla === "ventas_conversaciones") {
        return { update: (patch: unknown) => ({ eq: (_col: string, id: string) => actualizarConversacionMock(patch, id) }) };
      }
      throw new Error(`tabla inesperada en el test: ${tabla}`);
    },
  }),
}));

import { actualizarConversacion, guardarEntrante, guardarSaliente } from "../db";

beforeEach(() => {
  upsertMock.mockReset();
  insertMock.mockReset().mockReturnValue({ error: null });
  actualizarConversacionMock.mockReset().mockReturnValue({ error: null });
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

describe("guardarSaliente", () => {
  it("inserta el saliente y actualiza el resumen de la conversación", async () => {
    await guardarSaliente({ conversacionId: "c1", wamid: "w-out", texto: "hola" });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(actualizarConversacionMock).toHaveBeenCalledTimes(1);
    const [patch, id] = actualizarConversacionMock.mock.calls[0];
    expect(id).toBe("c1");
    expect(patch).toMatchObject({ ultimo_texto: "hola" });
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
});
