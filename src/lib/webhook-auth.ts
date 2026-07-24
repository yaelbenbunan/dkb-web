import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

// Header only — never accept the secret via query string (it leaks into access
// logs, proxies and browser history).
export function providedSecret(req: NextRequest): string | null {
  const header =
    req.headers.get("x-webhook-secret") ?? req.headers.get("authorization");
  if (!header) return null;
  return header.replace(/^Bearer\s+/i, "").trim();
}

// Constant-time compare to avoid leaking the secret through timing.
export function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
