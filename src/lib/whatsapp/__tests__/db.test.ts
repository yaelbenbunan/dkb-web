import { describe, expect, it, vi, beforeEach } from "vitest";

// Corrección al brief: en supabase-js v2 `onConflict`/`ignoreDuplicates` solo
// existen en `.upsert()`; con `.insert()` se ignorarían en silencio y un
// reintento de Meta reventaría por el índice único de `wamid`.
const upsertMock = vi.fn();
// El doble de `ventas_conversaciones.update(...).eq(...)`, para comprobar que
// guardarEntrante actualiza (o no) el resumen desnormalizado según el mensaje
// sea nuevo o un duplicado.
const actualizarConversacionMock = vi.fn();

vi.mock("../../supabase-admin", () => ({
  // `db()` exige un cliente no nulo; el doble simula Supabase ya configurado.
  getSupabaseAdmin: () => ({
    from: (tabla: string) => {
      if (tabla === "ventas_mensajes") return { upsert: upsertMock };
      if (tabla === "ventas_conversaciones") {
        return { update: (patch: unknown) => ({ eq: (_col: string, id: string) => actualizarConversacionMock(patch, id) }) };
      }
      throw new Error(`tabla inesperada en el test: ${tabla}`);
    },
  }),
}));

import { guardarEntrante } from "../db";

beforeEach(() => {
  upsertMock.mockReset();
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
});
