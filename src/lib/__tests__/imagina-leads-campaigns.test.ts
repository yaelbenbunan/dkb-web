import { beforeEach, describe, expect, test, vi } from "vitest";

const state: {
  updatedTable: string | null;
  updated: Record<string, unknown> | null;
  eqField: string | null;
  eqValue: string | null;
  returnRows: { id: string }[];
  selectedTable: string | null;
  eqCalls: { field: string; value: unknown }[];
  notCalls: { field: string; op: string; value: unknown }[];
  returnLeadRows: unknown[];
} = {
  updatedTable: null,
  updated: null,
  eqField: null,
  eqValue: null,
  returnRows: [],
  selectedTable: null,
  eqCalls: [],
  notCalls: [],
  returnLeadRows: [],
};

const { getAdminMock } = vi.hoisted(() => ({ getAdminMock: vi.fn() }));
vi.mock("../supabase-admin", () => ({ getSupabaseAdmin: getAdminMock }));

function fakeClient() {
  return {
    from(table: string) {
      return {
        update(payload: Record<string, unknown>) {
          state.updatedTable = table;
          state.updated = payload;
          return {
            eq(field: string, value: string) {
              state.eqField = field;
              state.eqValue = value;
              return {
                async select() {
                  return { data: state.returnRows, error: null };
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
    state.returnLeadRows = [];
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

  test("listEmailableLeads aplica consent/email/email_status", async () => {
    state.returnLeadRows = [{ id: "lead-1" }];
    const rows = await listEmailableLeads();
    expect(state.selectedTable).toBe("imagina_leads");
    expect(state.eqCalls).toContainEqual({ field: "consent", value: true });
    expect(state.notCalls.some((c) => c.field === "email" && c.op === "is")).toBe(true);
    expect(
      state.notCalls.some((c) => c.field === "email_status" && c.op === "in"),
    ).toBe(true);
    expect(rows).toEqual([{ id: "lead-1" }]);
  });

  test("listEmailableLeads aplica filtros opcionales de status/campaign/channel", async () => {
    await listEmailableLeads({ status: "nuevo", campaign: "Kit Digital 2026", channel: "Web" });
    expect(state.eqCalls).toContainEqual({ field: "status", value: "nuevo" });
    expect(state.eqCalls).toContainEqual({ field: "campaign", value: "Kit Digital 2026" });
    expect(state.eqCalls).toContainEqual({ field: "channel", value: "Web" });
  });
});
