import { beforeEach, describe, expect, test, vi } from "vitest";

const state: {
  updatedTable: string | null;
  updated: Record<string, unknown> | null;
  eqField: string | null;
  eqValue: string | null;
  returnRows: { id: string; lead_id?: string }[];
  selectedTable: string | null;
  eqCalls: { field: string; value: unknown }[];
  notCalls: { field: string; op: string; value: unknown }[];
  orCalls: string[];
  returnLeadRows: unknown[];
  updateCalls: { table: string; payload: Record<string, unknown>; eqField: string; eqValue: unknown }[];
} = {
  updatedTable: null,
  updated: null,
  eqField: null,
  eqValue: null,
  returnRows: [],
  selectedTable: null,
  eqCalls: [],
  notCalls: [],
  orCalls: [],
  returnLeadRows: [],
  updateCalls: [],
};

const { getAdminMock } = vi.hoisted(() => ({ getAdminMock: vi.fn() }));
vi.mock("../supabase-admin", () => ({ getSupabaseAdmin: getAdminMock }));

function fakeClient() {
  return {
    from(table: string) {
      return {
        update(payload: Record<string, unknown>) {
          // Compat con los tests existentes: guarda la última llamada de update()
          // en los campos "planos", además de acumular el historial completo (se
          // necesita para el caso bounced/complained, que hace un segundo update
          // sobre `imagina_leads` tras el de `campaign_recipients`).
          state.updatedTable = table;
          state.updated = payload;
          return {
            eq(field: string, value: string) {
              state.eqField = field;
              state.eqValue = value;
              state.updateCalls.push({ table, payload, eqField: field, eqValue: value });
              const rowsForThisCall = table === "campaign_recipients" ? state.returnRows : [];
              return {
                async select() {
                  return { data: rowsForThisCall, error: null };
                },
                // El update sobre `imagina_leads` no encadena `.select()` — se
                // usa directamente el resultado de `.eq()` (thenable, como en
                // supabase-js real).
                then(resolve: (v: { data: null; error: null }) => unknown) {
                  return Promise.resolve({ data: null, error: null }).then(resolve);
                },
              };
            },
          };
        },
        select(_cols?: string) {
          state.selectedTable = table;
          const builder = {
            eq(field: string, value: unknown) {
              state.eqCalls.push({ field, value });
              return builder;
            },
            not(field: string, op: string, value: unknown) {
              state.notCalls.push({ field, op, value });
              return builder;
            },
            or(filter: string) {
              state.orCalls.push(filter);
              return builder;
            },
            then(res: (v: { data: unknown[]; error: null }) => unknown) {
              return Promise.resolve({ data: state.returnLeadRows, error: null }).then(res);
            },
          };
          return builder;
        },
      };
    },
  };
}

import {
  setCampaignRecipientStatusByMessageId,
  listEmailableLeads,
} from "../imagina-leads";

describe("campaign helpers en imagina-leads", () => {
  beforeEach(() => {
    state.updatedTable = null;
    state.updated = null;
    state.eqField = null;
    state.eqValue = null;
    state.returnRows = [];
    state.selectedTable = null;
    state.eqCalls = [];
    state.notCalls = [];
    state.orCalls = [];
    state.returnLeadRows = [];
    state.updateCalls = [];
    getAdminMock.mockReset().mockReturnValue(fakeClient());
  });

  test("setCampaignRecipientStatusByMessageId actualiza campaign_recipients por message_id", async () => {
    state.returnRows = [{ id: "rec-1" }];
    const n = await setCampaignRecipientStatusByMessageId("msg-abc", "delivered");
    expect(state.updatedTable).toBe("campaign_recipients");
    expect(state.eqField).toBe("message_id");
    expect(state.eqValue).toBe("msg-abc");
    expect(state.updated!.status).toBe("delivered");
    expect(n).toBe(1);
  });

  test("sin match devuelve 0", async () => {
    state.returnRows = [];
    const n = await setCampaignRecipientStatusByMessageId("no-existe", "bounced");
    expect(n).toBe(0);
  });

  test("'bounced' propaga email_status al lead (imagina_leads)", async () => {
    state.returnRows = [{ id: "rec-1", lead_id: "lead-1" }];
    const n = await setCampaignRecipientStatusByMessageId("msg-abc", "bounced");
    expect(n).toBe(1);
    const leadUpdate = state.updateCalls.find((c) => c.table === "imagina_leads");
    expect(leadUpdate).toBeDefined();
    expect(leadUpdate!.eqField).toBe("id");
    expect(leadUpdate!.eqValue).toBe("lead-1");
    expect(leadUpdate!.payload.email_status).toBe("bounced");
    expect(leadUpdate!.payload.consent).toBeUndefined();
  });

  test("'complained' propaga email_status y además pone consent=false", async () => {
    state.returnRows = [{ id: "rec-2", lead_id: "lead-2" }];
    const n = await setCampaignRecipientStatusByMessageId("msg-xyz", "complained");
    expect(n).toBe(1);
    const leadUpdate = state.updateCalls.find((c) => c.table === "imagina_leads");
    expect(leadUpdate).toBeDefined();
    expect(leadUpdate!.eqValue).toBe("lead-2");
    expect(leadUpdate!.payload.email_status).toBe("complained");
    expect(leadUpdate!.payload.consent).toBe(false);
  });

  test("'delivered' no toca imagina_leads", async () => {
    state.returnRows = [{ id: "rec-3", lead_id: "lead-3" }];
    await setCampaignRecipientStatusByMessageId("msg-ok", "delivered");
    expect(state.updateCalls.some((c) => c.table === "imagina_leads")).toBe(false);
  });

  test("listEmailableLeads aplica consent/email/email_status (incluye NULL)", async () => {
    state.returnLeadRows = [{ id: "lead-1" }];
    const rows = await listEmailableLeads();
    expect(state.selectedTable).toBe("imagina_leads");
    expect(state.eqCalls).toContainEqual({ field: "consent", value: true });
    expect(state.notCalls.some((c) => c.field === "email" && c.op === "is")).toBe(true);
    const orFilter = state.orCalls[0];
    expect(orFilter).toContain("email_status.is.null");
    expect(orFilter).toContain("not.in.(bounced,complained)");
    expect(rows).toEqual([{ id: "lead-1" }]);
  });

  test("listEmailableLeads aplica filtros opcionales de status/campaign/channel", async () => {
    await listEmailableLeads({ status: "nuevo", campaign: "Kit Digital 2026", channel: "Web" });
    expect(state.eqCalls).toContainEqual({ field: "status", value: "nuevo" });
    expect(state.eqCalls).toContainEqual({ field: "campaign", value: "Kit Digital 2026" });
    expect(state.eqCalls).toContainEqual({ field: "channel", value: "Web" });
  });
});
