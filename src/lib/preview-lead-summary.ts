import { getSectorLabel } from "./preview-themes";

/** Structured lead answers used to build the internal notification email.
 *  Shared so the (single) notification can be assembled from the follow-up
 *  action with the PDF attached. */
export interface LeadSummary {
  leadId: string;
  name: string;
  email: string;
  phone: string;
  businessType: "informativa" | "ecommerce";
  ecommerceKind?: string;
  businessName: string;
  sector: string;
  offerings: string[];
  palette: string;
  typography: string;
  style?: string;
  hasLogo: boolean;
  address?: string;
  city?: string;
  currentWebsite?: string;
  featuredDishes?: string[];
  valueProp: string;
}

export function leadTipoLabel(d: Pick<LeadSummary, "businessType" | "ecommerceKind">): string {
  return d.businessType === "ecommerce"
    ? `Ecommerce — ${d.ecommerceKind ?? "productos"}`
    : "Informativa";
}

/** Plain-text body for the internal lead notification. */
export function buildLeadEmailText(d: LeadSummary): string {
  return [
    `ID lead: ${d.leadId}`,
    "",
    "--- Contacto ---",
    `Nombre: ${d.name}`,
    `Email: ${d.email}`,
    `Teléfono: ${d.phone}`,
    "",
    "--- Respuestas ---",
    `Tipo de web: ${leadTipoLabel(d)}`,
    `Negocio: ${d.businessName} (sector: ${getSectorLabel(d.sector)})`,
    `Oferta: ${d.offerings.join(", ") || "—"}`,
    `Paleta: ${d.palette}`,
    `Tipografía: ${d.typography}`,
    `Estilo: ${d.style ?? "moderno"}`,
    `Logo: ${d.hasLogo ? "sí" : "no"}`,
    `Dirección: ${d.address || "—"}`,
    `Ciudad: ${d.city || "—"}`,
    `Web actual: ${d.currentWebsite || "—"}`,
    `Platos destacados: ${
      d.featuredDishes && d.featuredDishes.length > 0
        ? d.featuredDishes.join(", ")
        : "—"
    }`,
    "",
    "Toque personal:",
    d.valueProp,
    "",
    "Origen: /imagina-tu-web.",
  ].join("\n");
}
