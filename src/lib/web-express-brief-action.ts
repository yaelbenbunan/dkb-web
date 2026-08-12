"use server";

import { z } from "zod";
import { createWebhookLead, getLeadNotes, updateLeadField } from "./imagina-leads";
import { briefBySlug, briefBlocks, type BriefField } from "./web-express-brief";

/**
 * Guarda el cuestionario sobre el lead que ya existe en el CRM.
 *
 * Se casa por email porque es el único dato que la persona repite entre la
 * landing y el cuestionario, y llega desde el correo que le mandamos. Si no hay
 * lead previo se crea uno: es preferible un lead sin origen conocido a perder un
 * cuestionario que alguien acaba de tardar veinte minutos en rellenar.
 *
 * Las respuestas se APILAN sobre las notas, no las sustituyen: ahí están los
 * datos de cualificación del formulario original y perderlos dejaría a quien
 * atiende sin saber ni cómo contactar.
 */

const schema = z.object({
  slug: z.string().min(1),
  name: z.string().trim().min(3, "Escribe tu nombre y apellidos"),
  email: z.email("Revisa tu correo"),
  phone: z.string().trim().min(6, "Revisa el teléfono"),
  businessName: z.string().trim().min(2, "Falta el nombre que va en la web"),
  presentation: z.string().trim().min(20, "Cuéntanos un poco más sobre ti"),
  services: z.string().trim().min(10, "Falta la lista de servicios"),
  hasLogo: z.string().min(1, "Dinos si tienes logotipo"),
  website: z.string().max(0, "Honeypot field must be empty"),
});

export interface BriefResult {
  ok: boolean;
  error?: string;
}

/** Etiqueta legible + valor, para que las notas se lean sin descifrar nada. */
function collect(fd: FormData, fields: BriefField[]): string[] {
  const out: string[] = [];
  for (const f of fields) {
    const values = fd.getAll(f.name).map(String).filter((v) => v.trim());
    if (!values.length) continue;
    out.push(`${f.label}: ${values.join(", ")}`);
  }
  return out;
}

export async function submitWebExpressBrief(formData: FormData): Promise<BriefResult> {
  const parsed = schema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    businessName: formData.get("businessName"),
    presentation: formData.get("presentation"),
    services: formData.get("services"),
    hasLogo: formData.get("hasLogo"),
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Revisa los campos obligatorios." };
  }

  const brief = briefBySlug(parsed.data.slug);
  if (!brief) return { ok: false, error: "Cuestionario no encontrado." };

  // Un lead por email y campaña: si ya existe, se enriquece; si no, se crea.
  const saved = await createWebhookLead({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    channel: "Meta",
    campaign: brief.campaign,
    notes: `Origen: cuestionario de requerimientos (${brief.slug})`,
  });
  if (!saved.ok || !saved.id) {
    console.error("[web-express-brief] no se pudo persistir el lead:", saved.error);
    return { ok: false, error: "No pudimos guardar tus respuestas. Inténtalo de nuevo." };
  }

  const bloques = briefBlocks(brief)
    .map((b) => {
      const lineas = collect(formData, b.fields);
      return lineas.length ? `${b.title}\n${lineas.map((l) => `  ${l}`).join("\n")}` : null;
    })
    .filter(Boolean)
    .join("\n\n");

  const previas = await getLeadNotes(saved.id);
  const combinadas = previas
    ? `${previas}\n\n— Cuestionario de requerimientos —\n${bloques}`
    : `— Cuestionario de requerimientos —\n${bloques}`;
  await updateLeadField(saved.id, "notes", combinadas);

  return { ok: true };
}
