import "server-only";
import { createHash } from "node:crypto";

/** Mailchimp identifica a cada miembro por el MD5 del email en minúsculas. */
export function subscriberHash(email: string): string {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

interface MailchimpEnv { apiKey: string; audienceId: string; server: string; }

function readEnv(): MailchimpEnv | null {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
  const server = process.env.MAILCHIMP_SERVER_PREFIX;
  if (!apiKey || !audienceId || !server) return null;
  return { apiKey, audienceId, server };
}

/** Alta/actualización idempotente (upsert por hash) como `subscribed` (single
 *  opt-in) + tag opcional. Best-effort: si no hay config o falla la red, no
 *  lanza — el lead ya está guardado en Supabase. */
export async function addOrUpdateMember(
  email: string,
  tags: string[] = [],
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const env = readEnv();
  if (!env) {
    console.warn("[mailchimp] not configured — skipping");
    return { ok: false, skipped: true };
  }
  const clean = email.trim().toLowerCase();
  const base = `https://${env.server}.api.mailchimp.com/3.0/lists/${env.audienceId}/members/${subscriberHash(clean)}`;
  const auth = "Basic " + Buffer.from(`any:${env.apiKey}`).toString("base64");
  const headers = { Authorization: auth, "Content-Type": "application/json" };
  try {
    const res = await fetch(base, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        email_address: clean,
        status_if_new: "subscribed",
        status: "subscribed",
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[mailchimp] member upsert failed:", res.status, detail);
      return { ok: false, error: `status_${res.status}` };
    }
    if (tags.length) {
      const tagRes = await fetch(`${base}/tags`, {
        method: "POST",
        headers,
        body: JSON.stringify({ tags: tags.map((name) => ({ name, status: "active" })) }),
      });
      if (!tagRes.ok) console.error("[mailchimp] tag failed:", tagRes.status);
    }
    return { ok: true };
  } catch (e) {
    console.error("[mailchimp] network error:", (e as Error).message);
    return { ok: false, error: "network" };
  }
}
