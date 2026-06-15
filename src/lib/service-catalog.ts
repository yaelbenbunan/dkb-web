import "server-only";
import { createClient } from "@supabase/supabase-js";

// Catálogo de servicios para la calculadora del panel. La fuente de verdad es
// la tabla `servicios` de la plataforma financiera (otro proyecto Supabase).
// Como el CRM (dkb-web) no comparte credenciales con esa plataforma, usamos un
// SNAPSHOT incrustado por defecto y, si se configuran las env `FINANCE_SUPABASE_*`,
// lee el catálogo EN VIVO (server-only, sin exponer claves al cliente).

export interface CatalogItem {
  concepto: string;
  precioBase: number;
  tipo: string; // Puntual | Mensual | Anual
}
export type Catalogo = Record<string, CatalogItem[]>;

interface RawItem {
  categoria: string;
  concepto: string;
  precioBase: number;
  tipo: string;
}

// Snapshot tomado de la plataforma financiera el 2026-06-15 (51 servicios).
export const CATALOG_SNAPSHOT_DATE = "2026-06-15";
const SNAPSHOT: RawItem[] = [
  { categoria: "Administrativo", concepto: "Acceso mensual a CRM personalizado", precioBase: 70, tipo: "Mensual" },
  { categoria: "Administrativo", concepto: "Anualidad Dominio .com", precioBase: 25, tipo: "Anual" },
  { categoria: "Administrativo", concepto: "Anualidad Dominio .es", precioBase: 25, tipo: "Anual" },
  { categoria: "Administrativo", concepto: "Anualidad Hosting 1GB", precioBase: 140, tipo: "Anual" },
  { categoria: "Administrativo", concepto: "Google Workspace", precioBase: 69, tipo: "Anual" },
  { categoria: "Administrativo", concepto: "Integración entre CRM y web", precioBase: 150, tipo: "Puntual" },
  { categoria: "Administrativo", concepto: "Transferencia de dominios", precioBase: 25, tipo: "Puntual" },
  { categoria: "Consultoría", concepto: "Análisis y recomendaciones sitio web", precioBase: 200, tipo: "Puntual" },
  { categoria: "Desarrollo", concepto: "Desarrollo ecommerce", precioBase: 2000, tipo: "Puntual" },
  { categoria: "Desarrollo", concepto: "Desarrollo sitio web completo", precioBase: 2000, tipo: "Puntual" },
  { categoria: "Desarrollo", concepto: "Desarrollo web · Pago mensual", precioBase: 166.66, tipo: "Mensual" },
  { categoria: "Desarrollo", concepto: "Mantenimiento · Paquete 10 horas", precioBase: 450, tipo: "Puntual" },
  { categoria: "Desarrollo", concepto: "Mantenimiento · Paquete 15 horas", precioBase: 600, tipo: "Puntual" },
  { categoria: "Desarrollo", concepto: "Mantenimiento · Paquete 2 horas", precioBase: 120, tipo: "Puntual" },
  { categoria: "Desarrollo", concepto: "Mantenimiento · Paquete 3 horas", precioBase: 165, tipo: "Puntual" },
  { categoria: "Desarrollo", concepto: "Mantenimiento · Paquete 5 horas", precioBase: 250, tipo: "Puntual" },
  { categoria: "Desarrollo", concepto: "One page", precioBase: 500, tipo: "Puntual" },
  { categoria: "Diseño", concepto: "Diseño díptico", precioBase: 260, tipo: "Puntual" },
  { categoria: "Diseño", concepto: "Diseño lona", precioBase: 250, tipo: "Puntual" },
  { categoria: "Diseño", concepto: "Diseño personalizado", precioBase: 200, tipo: "Puntual" },
  { categoria: "Diseño", concepto: "Diseño tríptico", precioBase: 295, tipo: "Puntual" },
  { categoria: "Kit digital", concepto: "Ecommerce (Kit Digital)", precioBase: 2000, tipo: "Puntual" },
  { categoria: "Kit digital", concepto: "Gestión Redes Sociales (Kit Digital)", precioBase: 2000, tipo: "Puntual" },
  { categoria: "Kit digital", concepto: "SEO Avanzado (Kit Digital)", precioBase: 2000, tipo: "Puntual" },
  { categoria: "Kit digital", concepto: "Sitio Web Wordpress (Kit Digital)", precioBase: 2000, tipo: "Puntual" },
  { categoria: "Mailing", concepto: "Informativo", precioBase: 100, tipo: "Mensual" },
  { categoria: "Mailing", concepto: "Set up Proyecto nuevo", precioBase: 180, tipo: "Puntual" },
  { categoria: "Mailing", concepto: "Variantes de los informativos", precioBase: 36, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Comisión variable", precioBase: 200, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Dinamización de la cuenta", precioBase: 100, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Generación de contenido RRSS (12 posts + 6 stories)", precioBase: 750, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Generación de contenido RRSS (14/15 posts)", precioBase: 650, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Generación de contenido RRSS (4 posts + 2 stories)", precioBase: 260, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Generación de contenido RRSS (8 posts + 4 stories)", precioBase: 500, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Generación de contenido RRSS (Extra Kit Digital)", precioBase: 100, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Gestión campañas LinkedIn (básico)", precioBase: 250, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Gestión campañas LinkedIn (estándar)", precioBase: 350, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Gestión campañas Meta (básico)", precioBase: 250, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Gestión campañas Meta (estándar)", precioBase: 350, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Gestión campañas Tiktok (básico)", precioBase: 250, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Gestión de campañas Google Ads (básico)", precioBase: 250, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Gestión de campañas Google Ads (estándar)", precioBase: 350, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Gestión de campañas Google Ads (personalizado)", precioBase: 2420, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Gestión de contenido RRSS", precioBase: 400, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Replicar contenidos a otro canal", precioBase: 50, tipo: "Mensual" },
  { categoria: "Marketing", concepto: "Vídeos: guíon y edición", precioBase: 50, tipo: "Puntual" },
  { categoria: "SEO", concepto: "Análisis y tendencias de kw", precioBase: 225, tipo: "Puntual" },
  { categoria: "SEO", concepto: "Generación artículos blog (1/mes)", precioBase: 50, tipo: "Mensual" },
  { categoria: "SEO", concepto: "Generación artículos blog (2/mes)", precioBase: 90, tipo: "Mensual" },
  { categoria: "SEO", concepto: "Generación artículos blog (4/mes)", precioBase: 175, tipo: "Mensual" },
  { categoria: "SEO", concepto: "Generación artículos blog (8/mes)", precioBase: 265, tipo: "Mensual" },
];

function agrupar(items: RawItem[]): Catalogo {
  const orden = [...items].sort(
    (a, b) =>
      a.categoria.localeCompare(b.categoria) || a.concepto.localeCompare(b.concepto),
  );
  const out: Catalogo = {};
  for (const s of orden) {
    (out[s.categoria] ??= []).push({
      concepto: s.concepto,
      precioBase: s.precioBase,
      tipo: s.tipo,
    });
  }
  return out;
}

/** Devuelve el catálogo agrupado por categoría. Lee EN VIVO de la plataforma
 *  financiera si están configuradas las env `FINANCE_SUPABASE_*`; si no, usa el
 *  snapshot incrustado. `live` indica de dónde salió. */
export async function getServiceCatalog(): Promise<{ catalogo: Catalogo; live: boolean }> {
  const url = process.env.FINANCE_SUPABASE_URL;
  const key = process.env.FINANCE_SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    try {
      const sb = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await sb
        .from("servicios")
        .select("categoria, concepto, precio_base, tipo");
      if (!error && data && data.length) {
        const items: RawItem[] = data.map((r) => ({
          categoria: (r.categoria as string) ?? "",
          concepto: (r.concepto as string) ?? "",
          precioBase: Number(r.precio_base ?? 0),
          tipo: (r.tipo as string) ?? "",
        }));
        return { catalogo: agrupar(items), live: true };
      }
    } catch {
      /* cae al snapshot */
    }
  }
  return { catalogo: agrupar(SNAPSHOT), live: false };
}
