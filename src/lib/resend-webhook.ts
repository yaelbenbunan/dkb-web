import { createHmac, timingSafeEqual } from "node:crypto";

/** Verifica la firma Svix de un webhook de Resend.
 *  `secret` es "whsec_<base64>" (o el base64 pelado). La firma se calcula como
 *  base64(HMAC-SHA256(base64decode(secret), `${id}.${timestamp}.${body}`)) y el
 *  header `svix-signature` trae una lista separada por espacios de "v1,<sig>". */
export function verifyResendSignature(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  rawBody: string,
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  const secretB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let key: Buffer;
  try {
    key = Buffer.from(secretB64, "base64");
  } catch {
    return false;
  }
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  for (const part of signature.split(" ")) {
    const comma = part.indexOf(",");
    const sig = comma >= 0 ? part.slice(comma + 1) : part;
    const sigBuf = Buffer.from(sig);
    if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
      return true;
    }
  }
  return false;
}

const EVENT_STATUS: Record<string, "delivered" | "bounced" | "complained"> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

/** Estado que guardamos según el tipo de evento de Resend, o null si no interesa. */
export function resendEventStatus(
  type: string,
): "delivered" | "bounced" | "complained" | null {
  return EVENT_STATUS[type] ?? null;
}
