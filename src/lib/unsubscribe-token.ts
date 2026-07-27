import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 180 * 24 * 60 * 60 * 1000;

function secret(): string | null {
  return process.env.PROMO_TOKEN_SECRET ?? process.env.RESEND_API_KEY ?? null;
}

function sign(payload: string): string | null {
  const k = secret();
  return k ? createHmac("sha256", k).update(payload).digest("hex") : null;
}

export function mintUnsubscribeToken(leadId: string): string {
  const expiry = Date.now() + TTL_MS;
  const sig = sign(`${leadId}.${expiry}`);
  return sig ? `${expiry}.${sig}` : "";
}

export function verifyUnsubscribeToken(leadId: string, token: string): boolean {
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const expiry = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;
  const expected = sign(`${leadId}.${expiry}`);
  if (!expected || sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
