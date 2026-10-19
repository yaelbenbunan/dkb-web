import "server-only";
import { getSupabaseAdmin } from "../supabase-admin";
import { documentosSeccionA, parsearConstituciones, type FilaBorme } from "./borme";

/**
 * Importación de las constituciones del BORME que lanza el cron semanal
 * (`/api/cron/borme`). Hace lo mismo que `scripts/prospeccion/importar-borme.ts`
 * (que sigue sirviendo para cargas grandes a mano) pero sin consola ni
 * `process.exit`: devuelve el resumen o el error.
 */
const API = "https://www.boe.es/datosabiertos/api/borme/sumario";
const TANDA = 500;
const PAUSA_MS = 300;
const CABECERAS = { "User-Agent": "dinkbit-prospeccion/1.0 (+https://dinkbit.com; admin-es@dinkbit.com)" };

export type LeerBoe = (url: string, json: boolean) => Promise<string | null>;
export type GuardarFilas = (filas: FilaBorme[]) => Promise<string | null>;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET con dos reintentos. null si el BOE dice 404 (ese día no hubo BORME). */
const leerBoe: LeerBoe = async (url, json) => {
  for (let intento = 1; ; intento++) {
    await esperar(PAUSA_MS);
    try {
      const res = await fetch(url, { headers: { ...CABECERAS, Accept: json ? "application/json" : "application/xml" } });
      if (res.status === 404) return null;
      if (res.ok) return await res.text();
      if (intento >= 3) throw new Error(`El BOE respondió ${res.status} a ${url}`);
    } catch (e) {
      if (intento >= 3) throw e;
    }
    await esperar(2000 * intento);
  }
};

/** Upsert por id en tandas. Devuelve el error o null. */
const guardarEnSupabase: GuardarFilas = async (filas) => {
  const sb = getSupabaseAdmin();
  if (!sb) return "Sin cliente de Supabase";
  const ahora = new Date().toISOString();
  for (let i = 0; i < filas.length; i += TANDA) {
    const { error } = await sb.from("prospect_borme").upsert(
      filas.slice(i, i + TANDA).map((f) => ({ ...f, actualizado_en: ahora })),
      { onConflict: "id" },
    );
    if (error) return error.message;
  }
  return null;
};

/** Días (aaaa-mm-dd) desde hace `dias - 1` hasta `hoy`, ambos incluidos. */
export function rangoDias(hoy: Date, dias: number): string[] {
  const fin = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  return Array.from({ length: dias }, (_, i) => new Date(fin - (dias - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

export async function importarBorme(
  o: { dias: number; hoy?: Date },
  d: { leer: LeerBoe; guardar: GuardarFilas } = { leer: leerBoe, guardar: guardarEnSupabase },
): Promise<{ ok: true; dias: number; constituciones: number } | { ok: false; error: string }> {
  const filas: FilaBorme[] = [];
  const vistos = new Set<string>();
  try {
    for (const fecha of rangoDias(o.hoy ?? new Date(), o.dias)) {
      const cuerpo = await d.leer(`${API}/${fecha.replace(/-/g, "")}`, true);
      if (cuerpo === null) continue; // fin de semana o festivo
      for (const doc of documentosSeccionA(JSON.parse(cuerpo))) {
        const xml = await d.leer(doc.urlXml, false);
        if (xml === null) continue;
        for (const f of parsearConstituciones(xml, { ...doc, fecha })) {
          if (vistos.has(f.id)) continue;
          vistos.add(f.id);
          filas.push(f);
        }
      }
    }
  } catch (e) {
    return { ok: false, error: `No se pudo leer el BORME: ${(e as Error).message}` };
  }
  const error = await d.guardar(filas);
  if (error) return { ok: false, error: `No se pudo guardar: ${error}` };
  return { ok: true, dias: o.dias, constituciones: filas.length };
}
