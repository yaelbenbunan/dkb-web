import { beforeEach, describe, expect, test, vi } from "vitest";

// Encadenamiento de query builder de supabase-js simulado. Cada test define
// qué devuelve el SELECT (fila existente o null) y captura el UPDATE/INSERT.
const state: {
  selectRow: Record<string, unknown> | null;
  updated: Record<string, unknown> | null;
  upserted: Record<string, unknown> | null;
  ilikePattern: string | null;
} = { selectRow: null, updated: null, upserted: null, ilikePattern: null };

const { getAdminMock } = vi.hoisted(() => ({ getAdminMock: vi.fn() }));

vi.mock("../supabase-admin", () => ({ getSupabaseAdmin: getAdminMock }));

function fakeClient() {
  return {
    from() {
      return {
        // SELECT chain: select().ilike().eq().order().limit().maybeSingle()
        select() {
          const chain = {
            ilike(column: string, pattern: string) {
              state.ilikePattern = pattern;
              return chain;
            },
            eq() { return chain; },
            order() { return chain; },
            limit() { return chain; },
            async maybeSingle() { return { data: state.selectRow, error: null }; },
          };
          return chain;
        },
        // UPDATE chain: update(payload).eq()
        update(payload: Record<string, unknown>) {
          state.updated = payload;
          return { async eq() { return { error: null }; } };
        },
        // INSERT/UPSERT chain: upsert(row)
        async upsert(row: Record<string, unknown>) {
          state.upserted = row;
          return { error: null };
        },
      };
    },
  };
}

import { upsertKitDigital2026Lead } from "../imagina-leads";

const leadInput = () => ({
  name: "Nuria",
  email: "Nuria@Example.com",
  phone: "633333333",
  channel: "Web",
  campaign: "Kit Digital 2026",
  sector: "Hostelería/restauración",
  businessType: "Pyme",
  notes: "Origen: landing /kit-digital-2026 · Servicios de interés: Web, SEO",
});

describe("upsertKitDigital2026Lead", () => {
  beforeEach(() => {
    state.selectRow = null;
    state.updated = null;
    state.upserted = null;
    state.ilikePattern = null;
    getAdminMock.mockReset().mockReturnValue(fakeClient());
  });

  test("sin match → inserta fila nueva (createWebhookLead)", async () => {
    state.selectRow = null;
    const res = await upsertKitDigital2026Lead(leadInput());
    expect(res.ok).toBe(true);
    expect(res.matched).toBe(false);
    expect(state.upserted).not.toBeNull();
    expect(state.upserted!.campaign).toBe("Kit Digital 2026");
    expect(state.updated).toBeNull();
  });

  test("con match (lead de Meta) → enriquece conservando canal Meta y appende notas", async () => {
    state.selectRow = {
      id: "meta-1",
      name: "Nuria",
      phone: "633333333",
      notes: "Origen: Meta Lead Ads",
      channel: "Meta",
    };
    const res = await upsertKitDigital2026Lead(leadInput());
    expect(res.ok).toBe(true);
    expect(res.matched).toBe(true);
    expect(res.id).toBe("meta-1");
    expect(state.upserted).toBeNull(); // no insert
    // No pisa channel/campaign
    expect(state.updated).not.toHaveProperty("channel");
    expect(state.updated).not.toHaveProperty("campaign");
    // Setea columnas de la landing
    expect(state.updated!.sector).toBe("Hostelería/restauración");
    expect(state.updated!.business_type).toBe("Pyme");
    // Appende, no borra
    expect(state.updated!.notes).toContain("Origen: Meta Lead Ads");
    expect(state.updated!.notes).toContain("Servicios de interés: Web, SEO");
  });

  test("con match sin name/phone previos → los rellena", async () => {
    state.selectRow = { id: "meta-2", name: null, phone: null, notes: null, channel: "Meta" };
    await upsertKitDigital2026Lead(leadInput());
    expect(state.updated!.name).toBe("Nuria");
    expect(state.updated!.phone).toBe("633333333");
  });

  test("con match con name/phone previos → no los pisa", async () => {
    state.selectRow = { id: "meta-3", name: "Nombre Bueno", phone: "600000000", notes: null, channel: "Meta" };
    await upsertKitDigital2026Lead(leadInput());
    expect(state.updated).not.toHaveProperty("name");
    expect(state.updated).not.toHaveProperty("phone");
  });

  test("escapa comodines LIKE en email (_ en el local-part)", async () => {
    const leadWithUnderscore = {
      ...leadInput(),
      email: "john_doe@example.com",
    };
    state.selectRow = null; // sin match, solo queremos capturar el patrón
    await upsertKitDigital2026Lead(leadWithUnderscore);
    // El patrón enviado a ilike debe escapar el underscore
    expect(state.ilikePattern).toBe("john\\_doe@example.com");
  });
});
