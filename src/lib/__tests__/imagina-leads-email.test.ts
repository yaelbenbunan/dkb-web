import { beforeEach, describe, expect, test, vi } from "vitest";

const state: {
  updated: Record<string, unknown> | null;
  eqField: string | null;
  eqValue: string | null;
  returnRows: { id: string }[];
} = { updated: null, eqField: null, eqValue: null, returnRows: [] };

const { getAdminMock } = vi.hoisted(() => ({ getAdminMock: vi.fn() }));
vi.mock("../supabase-admin", () => ({ getSupabaseAdmin: getAdminMock }));

function fakeClient() {
  return {
    from() {
      return {
        update(payload: Record<string, unknown>) {
          state.updated = payload;
          return {
            eq(field: string, value: string) {
              state.eqField = field;
              state.eqValue = value;
              // setLeadEmailStatusByMessageId encadena .select("id"); setLeadEmailSent no.
              return {
                async select() {
                  return { data: state.returnRows, error: null };
                },
                then(res: (v: { error: null }) => unknown) {
                  // permite await directo (setLeadEmailSent)
                  return Promise.resolve({ error: null }).then(res);
                },
              };
            },
          };
        },
      };
    },
  };
}

import {
  setLeadEmailSent,
  setLeadEmailStatusByMessageId,
} from "../imagina-leads";

describe("email-status helpers", () => {
  beforeEach(() => {
    state.updated = null;
    state.eqField = null;
    state.eqValue = null;
    state.returnRows = [];
    getAdminMock.mockReset().mockReturnValue(fakeClient());
  });

  test("setLeadEmailSent guarda status=sent + message_id + timestamp por id", async () => {
    await setLeadEmailSent("lead-1", "msg-abc");
    expect(state.eqField).toBe("id");
    expect(state.eqValue).toBe("lead-1");
    expect(state.updated!.email_status).toBe("sent");
    expect(state.updated!.email_message_id).toBe("msg-abc");
    expect(state.updated!.email_updated_at).toBeTruthy();
  });

  test("setLeadEmailStatusByMessageId actualiza por message_id y devuelve nº filas", async () => {
    state.returnRows = [{ id: "lead-1" }];
    const n = await setLeadEmailStatusByMessageId("msg-abc", "bounced");
    expect(state.eqField).toBe("email_message_id");
    expect(state.eqValue).toBe("msg-abc");
    expect(state.updated!.email_status).toBe("bounced");
    expect(n).toBe(1);
  });

  test("sin match devuelve 0", async () => {
    state.returnRows = [];
    const n = await setLeadEmailStatusByMessageId("no-existe", "delivered");
    expect(n).toBe(0);
  });
});
