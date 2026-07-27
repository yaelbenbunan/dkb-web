import { beforeEach, describe, expect, test, vi } from "vitest";

const state: {
  insertedTable: string | null;
  inserted: Record<string, unknown> | Record<string, unknown>[] | null;
  updatedTable: string | null;
  updated: Record<string, unknown> | null;
  eqCalls: { field: string; value: unknown }[];
  selectedTable: string | null;
  returnRows: unknown[];
  returnRow: Record<string, unknown> | null;
  insertReturnId: string;
} = {
  insertedTable: null,
  inserted: null,
  updatedTable: null,
  updated: null,
  eqCalls: [],
  selectedTable: null,
  returnRows: [],
  returnRow: null,
  insertReturnId: "new-id",
};

const { getAdminMock } = vi.hoisted(() => ({ getAdminMock: vi.fn() }));
vi.mock("../supabase-admin", () => ({ getSupabaseAdmin: getAdminMock }));

function fakeClient() {
  return {
    from(table: string) {
      return {
        insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
          state.insertedTable = table;
          state.inserted = payload;
          return {
            select() {
              return {
                async single() {
                  return { data: { id: state.insertReturnId }, error: null };
                },
              };
            },
            then(res: (v: { error: null }) => unknown) {
              return Promise.resolve({ error: null }).then(res);
            },
          };
        },
        update(payload: Record<string, unknown>) {
          state.updatedTable = table;
          state.updated = payload;
          return {
            eq(field: string, value: unknown) {
              state.eqCalls.push({ field, value });
              return {
                eq(field2: string, value2: unknown) {
                  state.eqCalls.push({ field: field2, value: value2 });
                  return {
                    then(res: (v: { error: null }) => unknown) {
                      return Promise.resolve({ error: null }).then(res);
                    },
                  };
                },
                select() {
                  return {
                    async then(res: (v: { data: unknown[]; error: null }) => unknown) {
                      return res({ data: state.returnRows, error: null });
                    },
                    // Also support plain await (no .then chain call syntax issues)
                  };
                },
                then(res: (v: { error: null }) => unknown) {
                  return Promise.resolve({ error: null }).then(res);
                },
              };
            },
          };
        },
        select(_cols?: string) {
          state.selectedTable = table;
          const builder = {
            eq() {
              return builder;
            },
            not() {
              return builder;
            },
            order() {
              return builder;
            },
            limit() {
              return builder;
            },
            async maybeSingle() {
              return { data: state.returnRow, error: null };
            },
            then(res: (v: { data: unknown[]; error: null }) => unknown) {
              return Promise.resolve({ data: state.returnRows, error: null }).then(res);
            },
          };
          return builder;
        },
      };
    },
  };
}

import {
  createCampaign,
  getCampaign,
  listCampaigns,
  updateCampaign,
  setCampaignStatus,
  listEmailTemplates,
  saveEmailTemplate,
  insertCampaignRecipients,
  setCampaignRecipientMessageId,
} from "../campaigns";

describe("campaigns", () => {
  beforeEach(() => {
    state.insertedTable = null;
    state.inserted = null;
    state.updatedTable = null;
    state.updated = null;
    state.eqCalls = [];
    state.selectedTable = null;
    state.returnRows = [];
    state.returnRow = null;
    state.insertReturnId = "new-id";
    getAdminMock.mockReset().mockReturnValue(fakeClient());
  });

  test("createCampaign inserta status draft y devuelve id", async () => {
    const res = await createCampaign({ name: "Promo", concept: "Novedades" });
    expect(state.insertedTable).toBe("campaigns");
    expect((state.inserted as Record<string, unknown>).status).toBe("draft");
    expect((state.inserted as Record<string, unknown>).name).toBe("Promo");
    expect(res).toEqual({ id: "new-id" });
  });

  test("createCampaign sin Supabase devuelve null", async () => {
    getAdminMock.mockReturnValue(null);
    const res = await createCampaign({});
    expect(res).toBeNull();
  });

  test("updateCampaign actualiza por id", async () => {
    await updateCampaign("camp-1", { name: "Nuevo nombre", status: "draft" });
    expect(state.updatedTable).toBe("campaigns");
    expect(state.updated!.name).toBe("Nuevo nombre");
    expect(state.eqCalls[0]).toEqual({ field: "id", value: "camp-1" });
  });

  test("updateCampaign serializa blocks si es objeto", async () => {
    await updateCampaign("camp-1", { blocks: [{ id: "a", type: "hero" }] as unknown });
    expect(typeof state.updated!.blocks).toBe("string");
    expect(state.updated!.blocks).toContain("hero");
  });

  test("setCampaignStatus actualiza el status por id", async () => {
    await setCampaignStatus("camp-1", "sent");
    expect(state.updatedTable).toBe("campaigns");
    expect(state.updated!.status).toBe("sent");
    expect(state.eqCalls[0]).toEqual({ field: "id", value: "camp-1" });
  });

  test("getCampaign devuelve la fila o null", async () => {
    state.returnRow = { id: "camp-1", name: "X" };
    const row = await getCampaign("camp-1");
    expect(state.selectedTable).toBe("campaigns");
    expect(row).toEqual({ id: "camp-1", name: "X" });
  });

  test("listCampaigns devuelve filas (más recientes primero)", async () => {
    state.returnRows = [{ id: "1" }, { id: "2" }];
    const rows = await listCampaigns();
    expect(state.selectedTable).toBe("campaigns");
    expect(rows).toEqual([{ id: "1" }, { id: "2" }]);
  });

  test("listEmailTemplates lee de email_templates", async () => {
    state.returnRows = [{ id: "t1", name: "Tpl" }];
    const rows = await listEmailTemplates();
    expect(state.selectedTable).toBe("email_templates");
    expect(rows).toEqual([{ id: "t1", name: "Tpl" }]);
  });

  test("saveEmailTemplate inserta con is_builtin false", async () => {
    const res = await saveEmailTemplate({ name: "Tpl", blocks: [{ id: "a" }] });
    expect(state.insertedTable).toBe("email_templates");
    expect((state.inserted as Record<string, unknown>).is_builtin).toBe(false);
    expect((state.inserted as Record<string, unknown>).name).toBe("Tpl");
    expect(res).toEqual({ id: "new-id" });
  });

  test("insertCampaignRecipients inserta filas con status pending", async () => {
    await insertCampaignRecipients([
      { campaign_id: "camp-1", lead_id: "lead-1", email: "a@x.com" },
      { campaign_id: "camp-1", lead_id: "lead-2", email: "b@x.com", status: "sent" },
    ]);
    expect(state.insertedTable).toBe("campaign_recipients");
    const rows = state.inserted as Record<string, unknown>[];
    expect(rows[0].status).toBe("pending");
    expect(rows[1].status).toBe("sent");
  });

  test("setCampaignRecipientMessageId actualiza por campaign_id + lead_id", async () => {
    await setCampaignRecipientMessageId("camp-1", "lead-1", "msg-123");
    expect(state.updatedTable).toBe("campaign_recipients");
    expect(state.updated!.message_id).toBe("msg-123");
    expect(state.eqCalls).toContainEqual({ field: "campaign_id", value: "camp-1" });
    expect(state.eqCalls).toContainEqual({ field: "lead_id", value: "lead-1" });
  });
});
