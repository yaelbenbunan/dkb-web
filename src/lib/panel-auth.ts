// Shared-password auth for the internal /panel. Uses Web Crypto (HMAC-SHA256)
// so the SAME verify runs both in the Edge middleware and in server actions.
// No DB, no third-party auth: a single user/password from env + a signed,
// expiring cookie.

export const PANEL_COOKIE = "panel_session";
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function secret(): string {
  return process.env.PANEL_SECRET ?? "";
}

function b64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string): Promise<string | null> {
  const key = secret();
  if (!key) return null;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(data),
  );
  return b64url(sig);
}

/** Constant-time-ish string compare. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** Check the submitted credentials against the env-configured ones. */
export function checkCredentials(user: string, pass: string): boolean {
  const u = process.env.PANEL_USER ?? "";
  const p = process.env.PANEL_PASS ?? "";
  if (!u || !p) return false;
  return safeEqual(user, u) && safeEqual(pass, p);
}

/** Returns a signed session token `${exp}.${sig}` (or null if no secret). */
export async function createSessionToken(): Promise<string | null> {
  const exp = String(Date.now() + TTL_MS);
  const sig = await hmac(exp);
  return sig ? `${exp}.${sig}` : null;
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expMs = Number(exp);
  if (!Number.isFinite(expMs) || Date.now() > expMs) return false;
  const expected = await hmac(exp);
  return !!expected && safeEqual(sig, expected);
}
