/** Pure, dependency-free SSRF guards for {@link ./website-extract}. Kept in a
 *  separate module (no "server-only") so the security-critical logic can be
 *  unit-tested directly. */

/** Add a scheme if the user typed a bare domain (e.g. "miweb.com"). Returns
 *  null for anything that isn't a valid http/https URL. */
export function normalizeUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // If the input declares ANY scheme (e.g. "file://", "javascript:",
  // "mailto:"), it must be http/https — otherwise reject. A "scheme" here is a
  // leading "word://" or a leading "word:" where the word has no dot (so a bare
  // "host.com:8080" is still treated as a schemeless domain, not a scheme).
  const hasProtoSep = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  const hasSchemeNoDot = /^[a-z][a-z0-9+-]*:/i.test(trimmed);
  let candidate: string;
  if (hasProtoSep || hasSchemeNoDot) {
    if (!/^https?:\/\//i.test(trimmed)) return null;
    candidate = trimmed;
  } else {
    candidate = `https://${trimmed}`;
  }
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u;
  } catch {
    return null;
  }
}

/** Cheap string-level pre-check on the hostname. This is only the first gate —
 *  the authoritative SSRF defense is {@link isBlockedIp}, applied to every
 *  address the connection actually resolves to. */
export function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (!host.includes(".") && !host.includes(":")) return true; // bare → internal
  return false;
}

/** Authoritative SSRF check: is this resolved IP address in a range we must
 *  never connect to (loopback, private, link-local, CGNAT, cloud metadata,
 *  multicast/reserved, IPv6 ULA/link-local, IPv4-mapped variants)? */
export function isBlockedIp(ip: string): boolean {
  let addr = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
  addr = addr.split("%")[0]; // strip IPv6 zone id

  // IPv4-mapped IPv6 (::ffff:a.b.c.d) → evaluate as IPv4.
  const mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) addr = mapped[1];

  const v4 = addr.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const o = v4.slice(1).map(Number);
    if (o.some((n) => n > 255)) return true; // malformed → block
    const [a, b, c] = o;
    if (a === 0 || a === 10 || a === 127) return true; // this-host / RFC1918 / loopback
    if (a === 169 && b === 254) return true; // link-local + cloud metadata (169.254.169.254)
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
    if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24 (IETF protocol)
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18/15 benchmarking
    if (a >= 224) return true; // multicast (224/4) + reserved/broadcast (240/4)
    return false;
  }

  if (addr.includes(":")) {
    if (addr === "::1" || addr === "::") return true; // loopback / unspecified
    if (/^fe[89ab]/.test(addr)) return true; // fe80::/10 link-local
    if (/^f[cd]/.test(addr)) return true; // fc00::/7 unique-local
    if (addr.startsWith("::ffff:")) return true; // remaining IPv4-mapped forms
    return false;
  }

  // Not a literal IP — DNS lookups always yield literals, so anything else is
  // unexpected; block to stay safe.
  return true;
}
