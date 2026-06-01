import { GIFEncoder } from "gifenc";

// Dynamic animated countdown GIF for the offer email. Pure-JS 7-segment
// renderer (no canvas/fonts → reliable on serverless). Each request renders a
// short ticking window starting from the *current* remaining time, so every
// email open shows a live countdown toward the deadline passed in `?d=`.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- layout constants -------------------------------------------------------
const DW = 40; // digit width
const DH = 64; // digit height
const T = 8; // segment thickness
const COLON_W = 18;
const GAP = 9; // gap between digits
const PAD = 20;
const FRAMES = 60; // 60 ticking frames (1 fps), then loops

// 7-segment map: [A, B, C, D, E, F, G]
const SEGMENTS: Record<string, boolean[]> = {
  "0": [true, true, true, true, true, true, false],
  "1": [false, true, true, false, false, false, false],
  "2": [true, true, false, true, true, false, true],
  "3": [true, true, true, true, false, false, true],
  "4": [false, true, true, false, false, true, true],
  "5": [true, false, true, true, false, true, true],
  "6": [true, false, true, true, true, true, true],
  "7": [true, true, true, false, false, false, false],
  "8": [true, true, true, true, true, true, true],
  "9": [true, true, true, true, false, true, true],
};

// Palette indices
const BG = 0;
const ON = 2;
const ACCENT = 3;
const ALERT = 4;

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const n = parseInt(v, 16);
  if (Number.isNaN(n) || v.length !== 6) return [37, 99, 235];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function fillRect(
  buf: Uint8Array,
  W: number,
  H: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
) {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(W, Math.round(x + w));
  const y1 = Math.min(H, Math.round(y + h));
  for (let yy = y0; yy < y1; yy++) {
    const row = yy * W;
    for (let xx = x0; xx < x1; xx++) buf[row + xx] = color;
  }
}

function drawDigit(
  buf: Uint8Array,
  W: number,
  H: number,
  x: number,
  y: number,
  char: string,
  onColor: number,
) {
  const segs = SEGMENTS[char] ?? SEGMENTS["8"];
  const midY = y + (DH - T) / 2;
  const vH = (DH - 3 * T) / 2; // vertical segment height
  // Draw only lit segments so each digit is crisp on the dark background.
  const lit = (on: boolean, rx: number, ry: number, rw: number, rh: number) => {
    if (on) fillRect(buf, W, H, rx, ry, rw, rh, onColor);
  };
  // A top, G mid, D bottom
  lit(segs[0], x + T, y, DW - 2 * T, T);
  lit(segs[6], x + T, midY, DW - 2 * T, T);
  lit(segs[3], x + T, y + DH - T, DW - 2 * T, T);
  // F top-left, B top-right
  lit(segs[5], x, y + T, T, vH);
  lit(segs[1], x + DW - T, y + T, T, vH);
  // E bottom-left, C bottom-right
  lit(segs[4], x, midY + T, T, vH);
  lit(segs[2], x + DW - T, midY + T, T, vH);
}

function drawColon(
  buf: Uint8Array,
  W: number,
  H: number,
  x: number,
  y: number,
  color: number,
) {
  const dot = T;
  const cx = x + (COLON_W - dot) / 2;
  fillRect(buf, W, H, cx, y + DH * 0.3, dot, dot, color);
  fillRect(buf, W, H, cx, y + DH * 0.6, dot, dot, color);
}

function renderFrame(
  W: number,
  H: number,
  digits: string,
  onColor: number,
  colonColor: number,
): Uint8Array {
  const buf = new Uint8Array(W * H).fill(BG);
  let x = PAD;
  const y = PAD;
  // digits string is "HHMMSS"
  for (let i = 0; i < 6; i++) {
    drawDigit(buf, W, H, x, y, digits[i], onColor);
    x += DW + GAP;
    if (i === 1 || i === 3) {
      drawColon(buf, W, H, x - GAP / 2, y, colonColor);
      x += COLON_W;
    }
  }
  return buf;
}

function pad2(n: number): string {
  return String(Math.min(99, Math.max(0, n))).padStart(2, "0");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const deadline = Number(url.searchParams.get("d"));
  const accentHex = url.searchParams.get("a") ?? "2563eb";
  const accent = hexToRgb(accentHex);

  const W = PAD * 2 + 6 * DW + 5 * GAP + 2 * COLON_W;
  const H = PAD * 2 + DH;

  const palette: [number, number, number][] = [
    [15, 23, 42], // BG
    [40, 52, 74], // OFF (dim segment)
    [255, 255, 255], // ON
    accent, // ACCENT (colons)
    [239, 68, 68], // ALERT (expired)
  ];

  const gif = GIFEncoder();
  // Use a process-time clock; this is request time, not build time.
  const now = Date.now();
  let remaining = Number.isFinite(deadline) ? Math.floor((deadline - now) / 1000) : 0;
  if (remaining < 0) remaining = 0;

  if (remaining === 0) {
    const buf = renderFrame(W, H, "000000", ALERT, ALERT);
    gif.writeFrame(buf, W, H, { palette, delay: 1000, repeat: 0 });
  } else {
    for (let f = 0; f < FRAMES; f++) {
      const rem = Math.max(0, remaining - f);
      const hh = Math.floor(rem / 3600);
      const mm = Math.floor((rem % 3600) / 60);
      const ss = rem % 60;
      const digits = pad2(hh) + pad2(mm) + pad2(ss);
      // Last 5 minutes → numbers turn red for urgency.
      const onColor = rem <= 300 ? ALERT : ON;
      const buf = renderFrame(W, H, digits, onColor, ACCENT);
      gif.writeFrame(buf, W, H, {
        palette,
        delay: 1000,
        repeat: f === 0 ? 0 : undefined,
      });
    }
  }
  gif.finish();
  const bytes = gif.bytes();

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}
