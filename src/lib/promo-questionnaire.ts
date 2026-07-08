export interface PromoQuestionnaireInput {
  leadId: string;
  email: string;
  name: string;
  businessName: string;
  phone?: string;
  /** A qué se dedica (descripción libre). */
  activity: string;
  sector: string;
  /** Servicios/productos principales. */
  services: string;
  /** Qué necesita: "Web" | "Ecommerce" | "No lo tengo claro". */
  need: string;
  currentWebsite?: string;
  style: string;
  colors: string;
  typography: string;
  references?: string;
  /** Redes / presencia actual. */
  social?: string;
  /** Ruta del logo ya subido al bucket (o null). */
  logoPath?: string | null;
  extra?: string;
}

/** Mapea a los nombres de campo que espera `saveLead` (SaveLeadInput). */
export function promoQuestionnaireFields(input: PromoQuestionnaireInput) {
  return {
    id: input.leadId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    sector: input.sector,
    businessName: input.businessName,
    businessType: input.need,
    style: input.style,
    palette: input.colors,
    valueProp: input.activity,
    currentWebsite: input.currentWebsite,
  };
}

/** Serializa en texto lo que no tiene columna propia en `imagina_leads`. */
export function formatQuestionnaireNotes(input: PromoQuestionnaireInput): string {
  const lines = [`Servicios: ${input.services}`, `Tipografía: ${input.typography}`];
  if (input.references?.trim()) lines.push(`Referencias: ${input.references.trim()}`);
  if (input.social?.trim()) lines.push(`Redes/presencia: ${input.social.trim()}`);
  if (input.logoPath) lines.push(`Logo: ${input.logoPath}`);
  if (input.extra?.trim()) lines.push(`Otros: ${input.extra.trim()}`);
  return lines.join("\n");
}
