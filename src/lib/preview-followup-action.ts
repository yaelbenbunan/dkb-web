"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { Resend } from "resend";
import { PDFDocument } from "pdf-lib";
import { isValidContactEmail } from "./preview-validation";
import { verifyFollowupToken } from "./preview-followup-token";
import { buildOfferEmail, OFFER } from "./preview-offer-email";
import {
  buildLeadEmailText,
  leadTipoLabel,
  type LeadSummary,
} from "./preview-lead-summary";
import { saveLead, uploadPreviewPdf } from "./imagina-leads";

const IMAGE_RE = /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/;

const inputSchema = z.object({
  leadId: z.string().regex(/^[a-z0-9]{4,}-[a-z0-9]{4}$/, "leadId inválido"),
  followupToken: z.string().min(10).max(200),
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().refine(isValidContactEmail, "Email inválido"),
  phone: z.string().trim().max(40).default(""),
  businessName: z.string().trim().min(1).max(80),
  businessType: z.enum(["informativa", "ecommerce"]).default("informativa"),
  ecommerceKind: z.string().trim().max(20).optional(),
  sector: z.string().trim().max(40).default(""),
  offerings: z.array(z.string().trim().max(80)).max(20).default([]),
  palette: z.string().trim().max(40).default(""),
  typography: z.string().trim().max(40).default(""),
  style: z.string().trim().max(20).optional(),
  hasLogo: z.boolean().default(false),
  address: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  currentWebsite: z.string().trim().max(300).optional(),
  featuredDishes: z.array(z.string().trim().max(80)).max(10).default([]),
  valueProp: z.string().trim().max(1200).default(""),
  // Optional — the captured preview JPEG/PNG (up to ~10 MB of base64). When
  // absent (capture failed) we still send the notification, just without PDF.
  imageDataUrl: z.string().max(11_000_000).optional().default(""),
});

export interface PreviewFollowupResult {
  ok: boolean;
  error?: string;
}

const TTL_MS = OFFER.ttlHours * 60 * 60 * 1000;

// --- Abuse throttle (best-effort, per-instance) -----------------------------
const HOUR = 60 * 60 * 1000;
const MAX_SENDS_PER_EMAIL_PER_HOUR = 3;
const MAX_SENDS_PER_IP_PER_HOUR = 8;
const usedTokens = new Map<string, number>();
const sendsByEmail = new Map<string, number[]>();
const sendsByIp = new Map<string, number[]>();

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

function throttle(email: string, ip: string, token: string): boolean {
  const now = Date.now();
  if (usedTokens.has(token)) return true;
  if (windowLimited(sendsByIp, ip, MAX_SENDS_PER_IP_PER_HOUR, now)) return true;
  if (
    windowLimited(sendsByEmail, email.trim().toLowerCase(), MAX_SENDS_PER_EMAIL_PER_HOUR, now)
  ) {
    return true;
  }
  usedTokens.set(token, now);
  if (usedTokens.size > 5000) {
    for (const [t, ts] of usedTokens) if (now - ts > TTL_MS) usedTokens.delete(t);
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
  const pageWidth = 800;
  const pageHeight = (img.height / img.width) * pageWidth;
  const page = pdf.addPage([pageWidth, pageHeight]);
  page.drawImage(img, { x: 0, y: 0, width: pageWidth, height: pageHeight });
  return pdf.save();
}

function parseList(v: FormDataEntryValue | null): string[] {
  if (typeof v !== "string" || !v) return [];
  try {
    const a = JSON.parse(v);
    return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function sendPreviewFollowup(
  formData: FormData,
): Promise<PreviewFollowupResult> {
  const parsed = inputSchema.safeParse({
    leadId: formData.get("leadId"),
    followupToken: formData.get("followupToken"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    businessName: formData.get("businessName"),
    businessType: formData.get("businessType") || "informativa",
    ecommerceKind: formData.get("ecommerceKind") || undefined,
    sector: formData.get("sector") ?? "",
    offerings: parseList(formData.get("offerings")),
    palette: formData.get("palette") ?? "",
    typography: formData.get("typography") ?? "",
    style: formData.get("style") || undefined,
    hasLogo: formData.get("hasLogo") === "true",
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
    currentWebsite: formData.get("currentWebsite") || undefined,
    featuredDishes: parseList(formData.get("featuredDishes")),
    valueProp: formData.get("valueProp") ?? "",
    imageDataUrl: formData.get("imageDataUrl") ?? "",
  });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const d = parsed.data;

  if (!verifyFollowupToken(d.leadId, d.email, d.followupToken)) {
    return { ok: false, error: "No autorizado." };
  }
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (throttle(d.email, ip, d.followupToken)) {
    return { ok: false, error: "Solicitud duplicada o límite alcanzado." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const internalTo = process.env.CONTACT_EMAIL_TO;
  const internalFrom = process.env.CONTACT_EMAIL_FROM ?? OFFER.fromEmail;
  if (!apiKey) {
    console.error("[preview-followup] missing RESEND_API_KEY");
    return { ok: false, error: "Servidor mal configurado." };
  }

  // PDF is best-effort — if the capture is missing/unusable we still notify.
  let attachment: { filename: string; content: Buffer } | null = null;
  if (IMAGE_RE.test(d.imageDataUrl)) {
    try {
      const pdfBytes = await imageToPdf(d.imageDataUrl);
      attachment = { filename: "preview-dinkbit.pdf", content: Buffer.from(pdfBytes) };
    } catch (err) {
      console.error("[preview-followup] PDF generation failed:", err);
    }
  }

  // Persist the lead (+ PDF) to Supabase so it shows up in the internal panel.
  // Best-effort: failures here never block the emails.
  let pdfPath: string | null = null;
  if (attachment) {
    pdfPath = await uploadPreviewPdf(d.leadId, attachment.content);
  }
  await saveLead({
    id: d.leadId,
    name: d.name,
    email: d.email,
    phone: d.phone,
    sector: d.sector,
    businessName: d.businessName,
    businessType: d.businessType,
    style: d.style,
    palette: d.palette,
    valueProp: d.valueProp,
    currentWebsite: d.currentWebsite,
    pdfPath,
  });

  const resend = new Resend(apiKey);

  // 1) Single internal notification: answers + the preview PDF (when available).
  if (internalTo) {
    const summary: LeadSummary = {
      leadId: d.leadId,
      name: d.name,
      email: d.email,
      phone: d.phone,
      businessType: d.businessType,
      ecommerceKind: d.ecommerceKind,
      businessName: d.businessName,
      sector: d.sector,
      offerings: d.offerings,
      palette: d.palette,
      typography: d.typography,
      style: d.style,
      hasLogo: d.hasLogo,
      address: d.address,
      city: d.city,
      currentWebsite: d.currentWebsite,
      featuredDishes: d.featuredDishes,
      valueProp: d.valueProp,
    };
    const internal = await resend.emails.send({
      from: internalFrom,
      to: internalTo,
      replyTo: d.email,
      subject: `Preview Web — ${d.name} (${leadTipoLabel(d)}) [#${d.leadId}]`,
      text: buildLeadEmailText(summary),
      attachments: attachment ? [attachment] : undefined,
    });
    if (internal.error) {
      console.error("[preview-followup] internal email error:", internal.error);
    }
  }

  // 2) User-facing offer email (with PDF when available). From a real, monitored
  // address on the verified domain — never a noreply — since it invites replies.
  const deadlineMs = Date.now() + TTL_MS;
  const countdownUrl = `${OFFER.siteUrl}/api/countdown?d=${deadlineMs}&a=${OFFER.accentHex}`;
  const offer = buildOfferEmail({
    name: d.name,
    businessName: d.businessName,
    leadId: d.leadId,
    deadlineMs,
    countdownUrl,
  });
  const userSend = await resend.emails.send({
    from: `dinkbit <${OFFER.fromEmail}>`,
    to: d.email,
    replyTo: OFFER.contactEmail,
    subject: offer.subject,
    html: offer.html,
    text: offer.text,
    attachments: attachment ? [attachment] : undefined,
  });
  if (userSend.error) {
    console.error("[preview-followup] user email error:", userSend.error);
    return { ok: false, error: "No se pudo enviar el email." };
  }

  return { ok: true };
}
