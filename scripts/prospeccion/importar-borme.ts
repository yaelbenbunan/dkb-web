// Importa a `prospect_borme` las sociedades constituidas que publica el BORME
// (sección A) en un rango de días. Lee la API de datos abiertos del BOE: un
// sumario por día y un XML por provincia. Re-ejecutable: upsert por id.
//
// Spec: docs/superpowers/specs/2026-10-19-prospeccion-borme-design.md
// Requiere la migración docs/sql/2026-10-19-prospeccion-borme.sql (salvo en --dry-run).
// Solo guarda datos de la sociedad: los nombres de administradores y socios
// del BORME se descartan al leer (ver src/lib/prospeccion/borme.ts).
//
// Uso (Node 23.6 o posterior, que ejecuta TypeScript sin compilar):
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/prospeccion/importar-borme.ts --dry-run --dias 7
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --env-file=.env.local scripts/prospeccion/importar-borme.ts --dias 90
//
// Opciones:
//   --dias 7                 los últimos N días naturales, hoy incluido (por defecto 7)
//   --desde 2026-10-01       desde ese día (en lugar de --dias)
//   --hasta 2026-10-16       hasta ese día (por defecto, hoy)
//   --provincia Madrid       solo esa provincia
//   --dry-run                no escribe en Supabase
//   --salida archivo.json    guarda las filas en un JSON
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { setTimeout as esperar } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";
import { documentosSeccionA, parsearConstituciones, type FilaBorme } from "../../src/lib/prospeccion/borme.ts";
import { provinciaDeTexto } from "../../src/lib/prospeccion/provincias.ts";

const API = "https://www.boe.es/datosabiertos/api/borme/sumario";
const TANDA = 500;
/** Pausa entre peticiones al BOE: el servidor es público y no hay prisa. */
const PAUSA_MS = 300;
const CABECERAS = { "User-Agent": "dinkbit-prospeccion/1.0 (+https://dinkbit.com; admin-es@dinkbit.com)" };

const { values: o } = parseArgs({
  options: {
    dias: { type: "string" },
    desde: { type: "string" },
    hasta: { type: "string" },
    provincia: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    salida: { type: "string" },
  },
});

function salir(mensaje: string): never {
  console.error(mensaje);
  process.exit(1);
}

const esFecha = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const hoy = new Date().toISOString().slice(0, 10);
if (o.dias && o.desde) salir("Usa --dias o --desde, no los dos.");
const hasta = o.hasta ?? hoy;
if (!esFecha(hasta)) salir("--hasta va como aaaa-mm-dd.");
let desde: string;
if (o.desde) {
  if (!esFecha(o.desde)) salir("--desde va como aaaa-mm-dd.");
  desde = o.desde;
} else {
  const n = Number(o.dias ?? "7");
  if (!Number.isInteger(n) || n < 1 || n > 400) salir("--dias va de 1 a 400.");
  desde = new Date(Date.parse(`${hasta}T00:00:00Z`) - (n - 1) * 86_400_000).toISOString().slice(0, 10);
}
if (desde > hasta) salir("--desde es posterior a --hasta.");
const provincia = o.provincia ? provinciaDeTexto(o.provincia) : null;
if (o.provincia && !provincia) salir(`No conozco la provincia «${o.provincia}».`);

const seco = o["dry-run"];
const sb = seco
  ? null
  : (() => {
      const url = process.env.SUPABASE_URL;
      const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !clave) salir("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (node --env-file=.env.local …) o usa --dry-run.");
      return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
    })();

/** GET con dos reintentos. null si el BOE dice 404 (ese día no hubo BORME). */
async function leer(url: string, json: boolean): Promise<string | null> {
  for (let intento = 1; ; intento++) {
    await esperar(PAUSA_MS);
    try {
      const res = await fetch(url, { headers: { ...CABECERAS, Accept: json ? "application/json" : "application/xml" } });
      if (res.status === 404) return null;
      if (res.ok) return await res.text();
      if (intento >= 3) salir(`El BOE respondió ${res.status} a ${url}.`);
    } catch (e) {
      if (intento >= 3) salir(`No se pudo leer ${url}: ${(e as Error).message}`);
    }
    await esperar(2000 * intento);
  }
}

const inicio = Date.now();
console.log(`BORME · constituciones del ${desde} al ${hasta}${provincia ? ` · ${provincia}` : ""}${seco ? " · simulacro" : ""}`);

const filas: FilaBorme[] = [];
const vistos = new Set<string>();
for (let t = Date.parse(`${desde}T00:00:00Z`); t <= Date.parse(`${hasta}T00:00:00Z`); t += 86_400_000) {
  const fecha = new Date(t).toISOString().slice(0, 10);
  const cuerpo = await leer(`${API}/${fecha.replace(/-/g, "")}`, true);
  if (cuerpo === null) continue; // fin de semana o festivo
  let sumario: unknown;
  try {
    sumario = JSON.parse(cuerpo);
  } catch {
    salir(`El sumario del ${fecha} no es JSON.`);
  }
  const docs = documentosSeccionA(sumario).filter((d) => !provincia || d.provincia === provincia);
  let delDia = 0;
  let madrid = 0;
  for (const d of docs) {
    const xml = await leer(d.urlXml, false);
    if (xml === null) continue;
    for (const f of parsearConstituciones(xml, { ...d, fecha })) {
      if (vistos.has(f.id)) continue;
      vistos.add(f.id);
      filas.push(f);
      delDia++;
      if (f.provincia === "Madrid") madrid++;
    }
  }
  console.log(`  ${fecha}: ${delDia} constituciones${provincia ? "" : ` (Madrid ${madrid})`} en ${docs.length} provincias`);
}

const pct = (n: number) => `${filas.length ? Math.round((n / filas.length) * 100) : 0} %`;
console.log(
  `Total: ${filas.length} · con domicilio ${pct(filas.filter((f) => f.municipio).length)}` +
    ` · con objeto ${pct(filas.filter((f) => f.objeto).length)} · con capital ${pct(filas.filter((f) => f.capital !== null).length)}` +
    ` · declaran web ${filas.filter((f) => f.web).length}`,
);

if (o.salida) {
  await writeFile(o.salida, JSON.stringify(filas, null, 2));
  console.log(`Guardado en ${o.salida}.`);
}

if (sb) {
  const ahora = new Date().toISOString();
  for (let i = 0; i < filas.length; i += TANDA) {
    const tanda = filas.slice(i, i + TANDA).map((f) => ({ ...f, actualizado_en: ahora }));
    const { error } = await sb.from("prospect_borme").upsert(tanda, { onConflict: "id" });
    if (error) salir(`Falló la subida en la fila ${i}: ${error.message}. Lo anterior ya está subido; se puede re-ejecutar.`);
    process.stdout.write(`\rSubidas ${Math.min(i + TANDA, filas.length)} de ${filas.length}`);
  }
  process.stdout.write("\n");
}

console.log(`Hecho en ${((Date.now() - inicio) / 1000).toFixed(1)} s.`);
