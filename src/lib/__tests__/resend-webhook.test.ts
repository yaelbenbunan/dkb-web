import { createHmac } from "node:crypto";
import { describe, expect, test } from "vitest";
import { verifyResendSignature, resendEventStatus } from "../resend-webhook";

// Genera una firma Svix válida para el test (mismo algoritmo que el verificador).
function sign(secretB64: string, id: string, ts: string, body: string): string {
  const key = Buffer.from(secretB64, "base64");
  const sig = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
  return `v1,${sig}`;
}

const SECRET_B64 = Buffer.from("supersecretkey-supersecretkey").toString("base64");
const SECRET = `whsec_${SECRET_B64}`;

describe("verifyResendSignature", () => {
  const id = "msg_1";
  const ts = "1700000000";
  const body = '{"type":"email.bounced"}';

  test("firma válida → true", () => {
    const signature = sign(SECRET_B64, id, ts, body);
    expect(verifyResendSignature(SECRET, { id, timestamp: ts, signature }, body)).toBe(true);
  });

  test("acepta el secreto sin el prefijo whsec_", () => {
    const signature = sign(SECRET_B64, id, ts, body);
    expect(verifyResendSignature(SECRET_B64, { id, timestamp: ts, signature }, body)).toBe(true);
  });

  test("cuerpo alterado → false", () => {
    const signature = sign(SECRET_B64, id, ts, body);
    expect(verifyResendSignature(SECRET, { id, timestamp: ts, signature }, body + "x")).toBe(false);
  });

  test("faltan headers → false", () => {
    expect(verifyResendSignature(SECRET, { id: null, timestamp: ts, signature: "v1,x" }, body)).toBe(false);
  });

  test("varias firmas en el header, una válida → true", () => {
    const good = sign(SECRET_B64, id, ts, body);
    const signature = `v1,otracosa ${good}`;
    expect(verifyResendSignature(SECRET, { id, timestamp: ts, signature }, body)).toBe(true);
  });
});

describe("resendEventStatus", () => {
  test("mapea los eventos que rastreamos", () => {
    expect(resendEventStatus("email.delivered")).toBe("delivered");
    expect(resendEventStatus("email.bounced")).toBe("bounced");
    expect(resendEventStatus("email.complained")).toBe("complained");
  });
  test("otros eventos → null", () => {
    expect(resendEventStatus("email.sent")).toBeNull();
    expect(resendEventStatus("email.opened")).toBeNull();
  });
});
