import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** El CTA del email abre el cuestionario y actualiza un lead concreto. Firmamos
 *  (leadId, email) con HMAC para que ese enlace no pueda falsificarse ni
 *  reasignarse a otro lead. Token válido 30 días (la promo dura todo el verano). */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function secret(): string | null {
  return process.env.PROMO_TOKEN_SECRET ?? process.env.RESEND_API_KEY ?? null;
}

function sign(payload: string): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key).update(payload).digest("hex");
}

export function mintPromoToken(leadId: string, email: string): string {
  const expiry = Date.now() + TTL_MS;
  const sig = sign(`${leadId}.${email.trim().toLowerCase()}.${expiry}`);
  if (!sig) {
    console.warn("[promo-token] no signing secret configured — token disabled");
    return "";
  }
  return `${expiry}.${sig}`;
}

export function verifyPromoToken(leadId: string, email: string, token: string): boolean {
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const expiry = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;
  const expected = sign(`${leadId}.${email.trim().toLowerCase()}.${expiry}`);
  if (!expected || sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
