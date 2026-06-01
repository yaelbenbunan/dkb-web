import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** The follow-up action emails the address the user typed, so it must not be
 *  callable to spam arbitrary inboxes with our brand. When a lead is created
 *  we mint a short-lived HMAC over (leadId, email) and hand it to the client;
 *  the follow-up action only fires if that token verifies. No DB needed. */

const TTL_MS = 15 * 60 * 1000; // tokens are valid for 15 minutes

/** Dedicated HMAC key. Prefer PREVIEW_FOLLOWUP_SECRET; fall back to the (also
 *  secret, high-entropy) RESEND_API_KEY so production keeps working without a
 *  new env, but NEVER to a hardcoded constant — a public key would let anyone
 *  forge tokens and bypass authorization. Returns null when no secret is
 *  configured, in which case we refuse to mint/verify (the follow-up just
 *  doesn't fire). Set a dedicated PREVIEW_FOLLOWUP_SECRET in production and
 *  rotate it by replacing the env var. */
function secret(): string | null {
  return (
    process.env.PREVIEW_FOLLOWUP_SECRET ?? process.env.RESEND_API_KEY ?? null
  );
}

function sign(payload: string): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key).update(payload).digest("hex");
}

/** Returns a token string `${expiry}.${hexSig}`, or "" if no secret is set. */
export function mintFollowupToken(leadId: string, email: string): string {
  const expiry = Date.now() + TTL_MS;
  const sig = sign(`${leadId}.${email.trim().toLowerCase()}.${expiry}`);
  if (!sig) {
    console.warn(
      "[preview-followup] no signing secret configured — follow-up disabled",
    );
    return "";
  }
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
  if (!expected || sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
