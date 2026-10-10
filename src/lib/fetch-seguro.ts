import "server-only";
import dns from "node:dns";
import type { LookupFunction } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import { isBlockedHost, isBlockedIp } from "./website-extract-guard";

/** Custom DNS resolver for undici. Runs for EVERY connection the dispatcher
 *  opens — the initial request and each redirect hop — and rejects the
 *  connection if any resolved address is in a blocked range. Because undici
 *  connects to exactly the address we return here, there is no resolve→connect
 *  TOCTOU gap (no DNS-rebinding window). */
export const ssrfLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) {
      callback(err, "", 0);
      return;
    }
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0) {
      callback(new Error("No address resolved"), "", 0);
      return;
    }
    const blocked = list.find((a) => isBlockedIp(a.address));
    if (blocked) {
      callback(
        new Error(`Blocked by SSRF guard: ${blocked.address}`),
        "",
        0,
      );
      return;
    }
    // Respect the shape undici asked for.
    if ((options as dns.LookupAllOptions).all) {
      callback(null, list as unknown as string, 0);
    } else {
      callback(null, list[0].address, list[0].family);
    }
  });
};

/** Agente de undici cuyas conexiones pasan todas por {@link ssrfLookup}. Quien
 *  lo crea lo cierra (`agente.close()`). */
export function crearAgenteSeguro(timeoutMs: number): Agent {
  return new Agent({
    connect: { lookup: ssrfLookup },
    headersTimeout: timeoutMs,
    bodyTimeout: timeoutMs,
  });
}

/** Descarga una página HTML a través del agente protegido, leyendo como mucho
 *  `maxBytes`. Devuelve null si no responde bien, no es HTML o acaba en un host
 *  bloqueado. Los errores de red se propagan: decide quien llama. */
export async function leerHtml(
  url: URL,
  o: { agente: Agent; signal: AbortSignal; maxBytes: number; userAgent: string },
): Promise<{ urlFinal: URL; html: string } | null> {
  const res = await undiciFetch(url, {
    method: "GET",
    redirect: "follow", // each hop re-connects through ssrfLookup → revalidated
    signal: o.signal,
    dispatcher: o.agente,
    headers: { "User-Agent": o.userAgent, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok || !res.body) return null;
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("html")) return null;

  // Final URL host re-check (defense in depth; the lookup already vetted the
  // IP of every hop).
  const urlFinal = new URL(res.url || url.toString());
  if (isBlockedHost(urlFinal.hostname)) return null;

  // Read at most maxBytes so a giant page can't exhaust memory.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  let received = 0;
  while (received < o.maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    html += decoder.decode(value, { stream: true });
  }
  await reader.cancel().catch(() => {});
  return { urlFinal, html };
}

const TIMEOUT_MS = 6000;
const MAX_BYTES = 600_000;

/** Lee una página suelta, con su propio agente y su propio límite de tiempo.
 *  Nunca lanza: cualquier problema es null. */
export async function leerPaginaSegura(url: URL): Promise<{ urlFinal: URL; html: string } | null> {
  if (isBlockedHost(url.hostname)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const agente = crearAgenteSeguro(TIMEOUT_MS);
  try {
    return await leerHtml(url, {
      agente,
      signal: controller.signal,
      maxBytes: MAX_BYTES,
      userAgent: "Mozilla/5.0 (compatible; DinkbitBot/1.0; +https://www.dinkbit.es)",
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    await agente.close().catch(() => {});
  }
}
