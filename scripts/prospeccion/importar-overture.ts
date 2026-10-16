// Importa a `prospect_lugares` los negocios de España de Overture Maps Places
// en las categorías de Prospección. Overture no tiene API: publica GeoParquet
// en S3 cada mes y aquí se lee con DuckDB. Re-ejecutable: upsert por id.
//
// Spec: docs/superpowers/specs/2026-10-16-prospeccion-overture-design.md
// Requiere la migración docs/sql/2026-10-16-prospeccion-overture.sql (salvo en --dry-run).
//
// Uso (Node 23.6 o posterior, que ejecuta TypeScript sin compilar):
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/prospeccion/importar-overture.ts --dry-run --provincia Soria --salida /tmp/soria.json
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --env-file=.env.local scripts/prospeccion/importar-overture.ts
//
// Opciones:
//   --release 2026-09-23.1  release de Overture (por defecto, el último publicado)
//   --confianza 0.5         confianza mínima de Overture (0–1)
//   --provincia Soria       solo esa provincia (por código postal); para probar
//   --categorias dentistas,gimnasios  solo esas claves de categorias.ts (España
//                           entera son ~500.000 lugares; para no llenar la base)
//   --dry-run               no escribe en Supabase
//   --salida archivo.json   guarda las filas en un JSON
//   --borrar-antiguos       tras subir, borra las filas de releases anteriores
//                           (los negocios que ya no vienen); no con --provincia
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { DuckDBInstance } from "@duckdb/node-api";
import { createClient } from "@supabase/supabase-js";
import { CATEGORIAS } from "../../src/lib/prospeccion/categorias.ts";
import { consultaOverture, transformarLugar, type FilaLugar, type LugarBruto } from "../../src/lib/prospeccion/overture.ts";
import { codigoDeProvincia, PROVINCIAS } from "../../src/lib/prospeccion/provincias.ts";

const BUCKET = "https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com";
const TANDA = 500;

const { values: o } = parseArgs({
  options: {
    release: { type: "string" },
    confianza: { type: "string", default: "0.5" },
    provincia: { type: "string" },
    categorias: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    salida: { type: "string" },
    "borrar-antiguos": { type: "boolean", default: false },
  },
});

function salir(mensaje: string): never {
  console.error(mensaje);
  process.exit(1);
}

/** El último release publicado, leyendo los prefijos del bucket público. */
async function ultimoRelease(): Promise<string> {
  const res = await fetch(`${BUCKET}/?list-type=2&prefix=release/&delimiter=/`);
  if (!res.ok) salir(`No se pudo leer la lista de releases de Overture (${res.status}).`);
  const xml = await res.text();
  const versiones = [...xml.matchAll(/<Prefix>release\/(\d{4}-\d{2}-\d{2}\.\d+)\/<\/Prefix>/g)].map((m) => m[1]);
  if (versiones.length === 0) salir("El bucket de Overture no lista ningún release.");
  return versiones.sort().at(-1) as string;
}

const confianzaMinima = Number(o.confianza);
if (!Number.isFinite(confianzaMinima) || confianzaMinima < 0 || confianzaMinima > 1) salir("--confianza va de 0 a 1.");
const soloCategorias = o.categorias ? o.categorias.split(",").map((c) => c.trim()).filter(Boolean) : null;
const desconocidas = (soloCategorias ?? []).filter((c) => !CATEGORIAS.some((k) => k.clave === c));
if (desconocidas.length > 0) salir(`Categorías desconocidas: ${desconocidas.join(", ")}. Claves: ${CATEGORIAS.map((c) => c.clave).join(", ")}.`);
const cpPrefijo = o.provincia ? codigoDeProvincia(o.provincia) : undefined;
if (o.provincia && !cpPrefijo) salir(`No conozco la provincia «${o.provincia}».`);
if (o["borrar-antiguos"] && (o.provincia || o.categorias)) salir("--borrar-antiguos borraría lo que no se ha importado esta vez: no se combina con --provincia ni --categorias.");
const seco = o["dry-run"];
const sb = seco
  ? null
  : (() => {
      const url = process.env.SUPABASE_URL;
      const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !clave) salir("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (node --env-file=.env.local …) o usa --dry-run.");
      return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
    })();

const inicio = Date.now();
const release = o.release ?? (await ultimoRelease());
console.log(
  `Overture ${release} · España${cpPrefijo ? ` · ${PROVINCIAS[cpPrefijo]}` : ""} · confianza ≥ ${confianzaMinima}${seco ? " · simulacro" : ""}`,
);

const db = await DuckDBInstance.create(":memory:");
const con = await db.connect();
await con.run("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';");
const lectura = await con.runAndReadAll(consultaOverture({ release, confianzaMinima, cpPrefijo: cpPrefijo ?? undefined }));
const brutos = lectura.getRowObjectsJson() as unknown as LugarBruto[];
console.log(`Leídos ${brutos.length} lugares en ${((Date.now() - inicio) / 1000).toFixed(1)} s.`);

const filas: FilaLugar[] = [];
const vistos = new Set<string>();
for (const b of brutos) {
  const f = transformarLugar(b, { release, confianzaMinima });
  if (f && soloCategorias) f.categorias = f.categorias.filter((c) => soloCategorias.includes(c));
  if (f && f.categorias.length > 0 && !vistos.has(f.id)) {
    vistos.add(f.id);
    filas.push(f);
  }
}

const pct = (n: number) => `${filas.length ? Math.round((n / filas.length) * 100) : 0} %`;
console.log(
  `Válidos: ${filas.length} · con teléfono ${pct(filas.filter((f) => f.telefono).length)}` +
    ` · con web ${pct(filas.filter((f) => f.web).length)} · con email ${pct(filas.filter((f) => f.email).length)}` +
    ` · sin provincia ${filas.filter((f) => !f.provincia).length}`,
);
for (const c of CATEGORIAS.filter((k) => !soloCategorias || soloCategorias.includes(k.clave))) {
  const n = filas.filter((f) => f.categorias.includes(c.clave)).length;
  console.log(`  ${c.texto.padEnd(32)} ${n}`);
}

if (o.salida) {
  await writeFile(o.salida, JSON.stringify(filas, null, 2));
  console.log(`Guardado en ${o.salida}.`);
}

if (sb) {
  const ahora = new Date().toISOString();
  for (let i = 0; i < filas.length; i += TANDA) {
    const tanda = filas.slice(i, i + TANDA).map((f) => ({ ...f, actualizado_en: ahora }));
    const { error } = await sb.from("prospect_lugares").upsert(tanda, { onConflict: "id" });
    if (error) salir(`Falló la subida en la fila ${i}: ${error.message}. Lo anterior ya está subido; se puede re-ejecutar.`);
    process.stdout.write(`\rSubidos ${Math.min(i + TANDA, filas.length)} de ${filas.length}`);
  }
  process.stdout.write("\n");
  if (o["borrar-antiguos"]) {
    const { error, count } = await sb.from("prospect_lugares").delete({ count: "exact" }).neq("release", release);
    if (error) salir(`No se pudieron borrar los de releases anteriores: ${error.message}`);
    console.log(`Borrados ${count ?? 0} lugares que ya no vienen en ${release}.`);
  }
}

console.log(`Hecho en ${((Date.now() - inicio) / 1000).toFixed(1)} s.`);
