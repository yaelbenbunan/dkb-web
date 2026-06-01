import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** The follow-up action emails the address the user typed, so it must not be
 *  callable to spam arbitrary inboxes with our brand. When a lead is created
 *  we mint a short-lived HMAC over (leadId, email) and hand it to the client;
 *  the follow-up action only fires if that token verifies. No DB needed. */

const TTL_MS = 15 * 60 * 1000; // tokens are valid for 15 minutes

function secret(): string {
  return (
    process.env.PREVIEW_FOLLOWUP_SECRET ??
    process.env.RESEND_API_KEY ??
    "insecure-dev-secret"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** Returns a token string `${expiry}.${hexSig}`. */
export function mintFollowupToken(leadId: string, email: string): string {
  const expiry = Date.now() + TTL_MS;
  const sig = sign(`${leadId}.${email.trim().toLowerCase()}.${expiry}`);
  return `${expiry}.${sig}`;
}

export function verifyFollowupToken(
  leadId: string,
  email: string,
  token: string,
): boolean {
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const expiry = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;
  const expected = sign(`${leadId}.${email.trim().toLowerCase()}.${expiry}`);
  if (sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
