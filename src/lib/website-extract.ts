import "server-only";
import { Agent, fetch as undiciFetch } from "undici";
import sharp from "sharp";
import { crearAgenteSeguro, leerHtml } from "./fetch-seguro";
import { isBlockedHost, normalizeUrl } from "./website-extract-guard";

export interface WebsiteExtract {
  /** Resolved, normalized URL we actually fetched. */
  url: string;
  /** Plain-text summary (title + meta description + visible copy), capped. */
  summary: string;
  /** Absolute URL of a representative image (og:image / twitter:image), if any. */
  imageUrl?: string;
}

interface RawExtract extends WebsiteExtract {
  /** Width declared by the site for og:image, if any. */
  imageWidthHint?: number;
}

const FETCH_TIMEOUT_MS = 6000;
const MAX_BYTES = 600_000; // stop reading after ~600 KB of HTML
const MAX_SUMMARY_CHARS = 4000;
const MAX_IMAGE_BYTES = 3_000_000; // cap image download used only to measure size
/** A hero background needs real width; anything narrower looks soft/stretched,
 *  so we drop it and fall back to the curated stock photos. */
const MIN_IMAGE_WIDTH = 700;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ");
}

function matchAttr(html: string, regex: RegExp): string | undefined {
  const m = html.match(regex);
  return m?.[1]?.trim() || undefined;
}

/** Pull title + meta description + a chunk of visible body text out of raw HTML.
 *  Regex-based on purpose: no extra dependency, and we only need a rough
 *  textual fingerprint to feed the copywriting model. */
function extractFromHtml(html: string, baseUrl: URL): RawExtract {
  const title = matchAttr(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDesc =
    matchAttr(
      html,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    ) ??
    matchAttr(
      html,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
    );
  const ogImage =
    matchAttr(
      html,
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    ) ??
    matchAttr(
      html,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    );
  // Optional dimension hint declared by the site, e.g. <meta property=
  // "og:image:width" content="1200">. Lets us reject tiny images without a
  // round-trip when the site is honest about it.
  const ogWidthRaw = matchAttr(
    html,
    /<meta[^>]+property=["']og:image:width["'][^>]+content=["']([0-9]+)["']/i,
  );
  const imageWidthHint = ogWidthRaw ? Number(ogWidthRaw) : undefined;

  // Visible text: drop scripts/styles/noscript, strip tags, collapse whitespace.
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const bodyText = decodeEntities(body).replace(/\s+/g, " ").trim();

  const summary = decodeEntities(
    [
      title ? `Título: ${title}` : "",
      metaDesc ? `Descripción: ${metaDesc}` : "",
      bodyText ? `Contenido: ${bodyText}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  ).slice(0, MAX_SUMMARY_CHARS);

  // The image URL is rendered into the preview, so only surface it if its host
  // passes the same cheap block-list (it's loaded by the visitor's browser, not
  // fetched server-side, so we don't resolve DNS for it here).
  let imageUrl: string | undefined;
  if (ogImage) {
    try {
      const abs = new URL(ogImage, baseUrl);
      if (
        (abs.protocol === "http:" || abs.protocol === "https:") &&
        !isBlockedHost(abs.hostname)
      ) {
        imageUrl = abs.toString();
      }
    } catch {
      imageUrl = undefined;
    }
  }

  return { url: baseUrl.toString(), summary, imageUrl, imageWidthHint };
}

/** Fetch the user's current website and return a text summary (+ a candidate
 *  image URL) to ground the generated copy. Returns null on any problem —
 *  callers must treat this as best-effort and fall back gracefully.
 *
 *  SSRF defense: a custom undici dispatcher validates the resolved IP of every
 *  connection (initial request + each redirect hop) against {@link isBlockedIp}
 *  and refuses to connect to internal/loopback/metadata ranges. */
export async function extractWebsite(
  rawUrl: string | undefined,
): Promise<WebsiteExtract | null> {
  if (!rawUrl) return null;
  const url = normalizeUrl(rawUrl);
  if (!url || isBlockedHost(url.hostname)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const dispatcher = crearAgenteSeguro(FETCH_TIMEOUT_MS);

  try {
    const pagina = await leerHtml(url, {
      agente: dispatcher,
      signal: controller.signal,
      maxBytes: MAX_BYTES,
      userAgent: "Mozilla/5.0 (compatible; DinkbitPreviewBot/1.0)",
    });
    if (!pagina) return null;
    const { html, urlFinal: finalUrl } = pagina;

    const extracted = extractFromHtml(html, finalUrl);

    // Only keep the image if it's big enough to use as a hero. Prefer the
    // site-declared width; otherwise download it and measure. If we can't
    // confirm it meets the bar (blocked, too small, broken), drop it so the
    // template falls back to the curated stock photos.
    let imageUrl = extracted.imageUrl;
    if (imageUrl) {
      const ok =
        typeof extracted.imageWidthHint === "number"
          ? extracted.imageWidthHint >= MIN_IMAGE_WIDTH
          : (await measureImageWidth(imageUrl, dispatcher, controller.signal)) >=
            MIN_IMAGE_WIDTH;
      if (!ok) imageUrl = undefined;
    }

    const result: WebsiteExtract = {
      url: extracted.url,
      summary: extracted.summary,
      imageUrl,
    };
    if (!result.summary && !result.imageUrl) return null;
    return result;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    await dispatcher.close().catch(() => {});
  }
}

/** Download an image (size-capped, SSRF-safe via the same dispatcher) and
 *  return its pixel width, or 0 if it can't be fetched/decoded. */
async function measureImageWidth(
  url: string,
  dispatcher: Agent,
  signal: AbortSignal,
): Promise<number> {
  try {
    const res = await undiciFetch(url, {
      method: "GET",
      redirect: "follow",
      signal,
      dispatcher,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DinkbitPreviewBot/1.0)" },
    });
    if (!res.ok || !res.body) return 0;
    // Raster formats only. Excludes SVG on purpose — passing attacker-supplied
    // SVG to sharp/libvips (librsvg) is a parser-DoS / CVE risk.
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!allowed.some((a) => ct.startsWith(a))) return 0;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (received < MAX_IMAGE_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      chunks.push(value);
    }
    await reader.cancel().catch(() => {});
    const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    // Defense in depth: verify the bytes really are a raster image (content-type
    // can lie) before handing them to the decoder.
    if (!isRasterMagic(buf)) return 0;
    // metadata() only parses the header (no full pixel decode); disable SVG and
    // cap input pixels so a crafted file can't blow up memory/CPU.
    const meta = await sharp(buf, {
      failOn: "error",
      limitInputPixels: 100_000_000,
    }).metadata();
    return meta.width ?? 0;
  } catch {
    return 0;
  }
}

/** True if the buffer starts with the magic bytes of a supported raster image
 *  (JPEG, PNG, GIF, WebP, AVIF/HEIF). Rejects SVG and everything else. */
function isRasterMagic(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  ) {
    return true;
  }
  // GIF
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true;
  // WebP: "RIFF"...."WEBP"
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return true;
  }
  // AVIF / HEIF: "....ftyp...." with a known brand
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (["avif", "avis", "heic", "heix", "mif1", "msf1"].includes(brand)) {
      return true;
    }
  }
  return false;
}
