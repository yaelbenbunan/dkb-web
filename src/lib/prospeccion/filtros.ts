import type { EstadoProspecto, ProspectRow } from "./tipos";

export interface FiltrosProspectos {
  texto: string;
  /** Id de la búsqueda de origen, o "" para todas. */
  busqueda: string;
  estado: EstadoProspecto | "";
  email: "" | "con" | "sin";
  web: "" | "con" | "sin";
}

export const FILTROS_VACIOS: FiltrosProspectos = { texto: "", busqueda: "", estado: "", email: "", web: "" };

const plano = (s: string | null) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tiene = (s: string | null) => !!s && s.trim() !== "";

export function filtrarProspectos(lista: ProspectRow[], f: FiltrosProspectos): ProspectRow[] {
  const texto = plano(f.texto.trim());
  return lista.filter((p) => {
    if (f.estado && p.status !== f.estado) return false;
    if (f.busqueda && p.search_id !== f.busqueda) return false;
    if (f.email && tiene(p.email) !== (f.email === "con")) return false;
    if (f.web && tiene(p.website) !== (f.web === "con")) return false;
    if (texto && ![p.name, p.city, p.email, p.sector].some((v) => plano(v).includes(texto))) return false;
    return true;
  });
}
