import { describe, expect, it, vi, beforeEach } from "vitest";

// Corrección al brief: en supabase-js v2 `onConflict`/`ignoreDuplicates` solo
// existen en `.upsert()`; con `.insert()` se ignorarían en silencio y un
// reintento de Meta reventaría por el índice único de `wamid`.
const upsertMock = vi.fn();
vi.mock("../../supabase-admin", () => ({
  // `db()` exige un cliente no nulo; el doble simula Supabase ya configurado.
  getSupabaseAdmin: () => ({
    from: () => ({
      upsert: upsertMock,
    }),
  }),
}));

import { guardarEntrante } from "../db";

beforeEach(() => upsertMock.mockReset());

describe("guardarEntrante", () => {
  it("dice que es nuevo cuando la fila se inserta", async () => {
    upsertMock.mockReturnValue({ select: () => ({ data: [{ id: "m1" }], error: null }) });
    expect(await guardarEntrante({ conversacionId: "c1", wamid: "w1", texto: "hola", payload: {} })).toEqual({
      nuevo: true,
    });
  });

  // Review Focus 2: el reintento de Meta no debe producir una segunda respuesta.
  it("dice que no es nuevo si el wamid ya estaba", async () => {
    upsertMock.mockReturnValue({ select: () => ({ data: [], error: null }) });
    expect(await guardarEntrante({ conversacionId: "c1", wamid: "w1", texto: "hola", payload: {} })).toEqual({
      nuevo: false,
    });
  });
});
