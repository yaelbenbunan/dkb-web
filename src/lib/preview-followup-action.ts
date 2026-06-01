"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { Resend } from "resend";
import { PDFDocument } from "pdf-lib";
import { isValidContactEmail } from "./preview-validation";
import { verifyFollowupToken } from "./preview-followup-token";
import {
  buildOfferEmail,
  OFFER,
} from "./preview-offer-email";

const inputSchema = z.object({
  leadId: z.string().regex(/^[a-z0-9]{4,}-[a-z0-9]{4}$/, "leadId inválido"),
  followupToken: z.string().min(10).max(200),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().refine(isValidContactEmail, "Email inválido"),
  businessName: z.string().trim().min(2).max(60),
  // data:image/(jpeg|png);base64,... up to ~10 MB of base64.
  imageDataUrl: z
    .string()
    .regex(/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/, "Imagen inválida")
    .max(11_000_000, "Imagen demasiado grande"),
});

export interface PreviewFollowupResult {
  ok: boolean;
  error?: string;
}

const TTL_MS = OFFER.ttlHours * 60 * 60 * 1000;

// --- Abuse throttle (best-effort, per-instance) -----------------------------
// This action sends a branded email + an attacker-influenced attachment to a
// user-chosen address, so we cap it. The HMAC token already requires a real
// lead submission per (leadId, email); on top of that we make each token
// single-use and limit sends per address. NOTE: this is in-memory, so it is
// per serverless instance only — it blunts scripted bursts but is not a hard
// guarantee. Move to KV/Upstash if abuse is ever observed.
const HOUR = 60 * 60 * 1000;
const MAX_SENDS_PER_EMAIL_PER_HOUR = 3;
const MAX_SENDS_PER_IP_PER_HOUR = 8;
const usedTokens = new Map<string, number>();
const sendsByEmail = new Map<string, number[]>();
const sendsByIp = new Map<string, number[]>();

/** True if `key` has hit `max` events within the last hour (and records this
 *  one otherwise). */
function windowLimited(
  map: Map<string, number[]>,
  key: string,
  max: number,
  now: number,
): boolean {
  const recent = (map.get(key) ?? []).filter((t) => now - t < HOUR);
  if (recent.length >= max) {
    map.set(key, recent);
    return true;
  }
  recent.push(now);
  map.set(key, recent);
  return false;
}

/** Best-effort, per-instance throttle: single-use token + per-email + per-IP
 *  hourly caps. Not a hard guarantee on serverless (in-memory, per instance);
 *  move to KV/Upstash if abuse is observed. */
function throttle(email: string, ip: string, token: string): boolean {
  const now = Date.now();
  if (usedTokens.has(token)) return true; // single-use
  if (windowLimited(sendsByIp, ip, MAX_SENDS_PER_IP_PER_HOUR, now)) return true;
  if (
    windowLimited(
      sendsByEmail,
      email.trim().toLowerCase(),
      MAX_SENDS_PER_EMAIL_PER_HOUR,
      now,
    )
  ) {
    return true;
  }
  usedTokens.set(token, now);
  if (usedTokens.size > 5000) {
    for (const [t, ts] of usedTokens) {
      if (now - ts > TTL_MS) usedTokens.delete(t);
    }
  }
  return false;
}

/** Turn the captured preview image into a single-page PDF. */
async function imageToPdf(imageDataUrl: string): Promise<Uint8Array> {
  const isPng = imageDataUrl.startsWith("data:image/png");
  const base64 = imageDataUrl.slice(imageDataUrl.indexOf(",") + 1);
  const bytes = Buffer.from(base64, "base64");
  const pdf = await PDFDocument.create();
  const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  // Fixed page width; height scales to the capture's aspect ratio.
  const pageWidth = 800;
  const pageHeight = (img.height / img.width) * pageWidth;
  const page = pdf.addPage([pageWidth, pageHeight]);
  page.drawImage(img, { x: 0, y: 0, width: pageWidth, height: pageHeight });
  return pdf.save();
}

export async function sendPreviewFollowup(
  formData: FormData,
): Promise<PreviewFollowupResult> {
  const parsed = inputSchema.safeParse({
    leadId: formData.get("leadId"),
    followupToken: formData.get("followupToken"),
    name: formData.get("name"),
    email: formData.get("email"),
    businessName: formData.get("businessName"),
    imageDataUrl: formData.get("imageDataUrl"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const d = parsed.data;

  // Authorize: the token must match this lead + email and be unexpired. This
  // stops the action from being used to email arbitrary addresses.
  if (!verifyFollowupToken(d.leadId, d.email, d.followupToken)) {
    return { ok: false, error: "No autorizado." };
  }

  // Make the token single-use and cap sends per address + per IP (best-effort).
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  if (throttle(d.email, ip, d.followupToken)) {
    return { ok: false, error: "Solicitud duplicada o límite alcanzado." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const internalTo = process.env.CONTACT_EMAIL_TO;
  const from = process.env.CONTACT_EMAIL_FROM ?? "onboarding@resend.dev";
  if (!apiKey) {
    console.error("[preview-followup] missing RESEND_API_KEY");
    return { ok: false, error: "Servidor mal configurado." };
  }

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await imageToPdf(d.imageDataUrl);
  } catch (err) {
    console.error("[preview-followup] PDF generation failed:", err);
    return { ok: false, error: "No se pudo generar el PDF." };
  }
  const pdfBuffer = Buffer.from(pdfBytes);
  // Fixed filename — never derive it from user input (no header/path injection
  // and no attacker-chosen text in the attachment name).
  const pdfFilename = "preview-dinkbit.pdf";

  const deadlineMs = Date.now() + TTL_MS;
  const countdownUrl = `${OFFER.siteUrl}/api/countdown?d=${deadlineMs}&a=${OFFER.accentHex}`;
  const offer = buildOfferEmail({
    name: d.name,
    businessName: d.businessName,
    leadId: d.leadId,
    deadlineMs,
    countdownUrl,
  });

  const resend = new Resend(apiKey);
  const attachment = { filename: pdfFilename, content: pdfBuffer };

  // 1) User-facing offer email (with PDF). It invites a reply, so it must come
  // from a real, monitored address on the verified domain — never a noreply.
  const offerFrom = `dinkbit <${OFFER.fromEmail}>`;
  const userSend = await resend.emails.send({
    from: offerFrom,
    to: d.email,
    replyTo: OFFER.contactEmail,
    subject: offer.subject,
    html: offer.html,
    text: offer.text,
    attachments: [attachment],
  });
  if (userSend.error) {
    console.error("[preview-followup] user email error:", userSend.error);
    return { ok: false, error: "No se pudo enviar el email." };
  }

  // 2) Internal copy with the same PDF so the team has the preview on file.
  if (internalTo) {
    const internal = await resend.emails.send({
      from,
      to: internalTo,
      replyTo: d.email,
      subject: `📎 Preview PDF — ${d.name} [#${d.leadId}]`,
      text: [
        `PDF del preview generado para ${d.name} (${d.email}).`,
        `Negocio: ${d.businessName}`,
        `Lead: #${d.leadId}`,
        "",
        `Se le ha enviado la oferta de lanzamiento (-50%, 48 h, caduca ${new Date(
          deadlineMs,
        ).toISOString()}).`,
      ].join("\n"),
      attachments: [attachment],
    });
    if (internal.error) {
      // Non-fatal: the user already got their email + PDF.
      console.error("[preview-followup] internal email error:", internal.error);
    }
  }

  return { ok: true };
}
