#!/usr/bin/env node
// Comprueba que el catálogo de /puesto-seguro (src/lib/kit-digital-data.ts) es
// EXACTAMENTE el que publica el proveedor en
// https://kitdigital.ecomputer.es/puesto-de-trabajo-seguro/ — mismos equipos
// (ni más ni menos) y mismos precios.
//
// Uso:  node scripts/kit-catalogo-check.mjs
// Sale con código 0 si coincide, 1 si hay diferencias, 2 si no se pudo leer
// la página del proveedor (no se toca nada en ese caso).
//
// Para los equipos nuevos imprime nombre, ficha e imagen desde la Store API de
// WooCommerce, para poder darlos de alta. Ojo: la Store API devuelve también
// copias por partner (…-copia, …-z, …-bg); la fuente de verdad es SOLO la
// página pública, nunca el listado completo de la API.

import { ALL_DEVICES } from "../src/lib/kit-digital-data.ts";

const BASE = "https://kitdigital.ecomputer.es";
const PAGE = `${BASE}/puesto-de-trabajo-seguro/`;
const UA = "Mozilla/5.0 (compatible; dinkbit-catalog-check)";

function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;| /g, " ")
    .replace(/&amp;/g, "&");
}

function euros(raw) {
  // "1.149 €" -> 1149
  return Number(decode(raw).replace(/<[^>]+>/g, "").replace(/[^\d]/g, ""));
}

/** Lista de productos tal y como se ven en la página pública. */
function parseSupplierPage(html) {
  const blocks = html.split(/<li[^>]*class="[^"]*\bproduct\b/).slice(1);
  const out = [];
  for (const b of blocks) {
    const chunk = b.slice(0, 8000);
    const m = chunk.match(/href="https:\/\/kitdigital\.ecomputer\.es\/producto\/([^"/]+)\/?"/);
    if (!m) continue;
    const prices = [...chunk.matchAll(/<bdi>([\s\S]*?)<\/bdi>/g)].map((x) => euros(x[1]));
    if (prices.length < 2) continue;
    // WooCommerce: <del>precio total</del> <ins>lo que pagas</ins>
    out.push({ source: m[1], priceTotal: prices[0], pricePay: prices[1] });
  }
  // La página puede repetir un producto en dos carruseles: dedupe por slug.
  const seen = new Set();
  return out.filter((p) => (seen.has(p.source) ? false : (seen.add(p.source), true)));
}

async function get(url) {
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res;
}

async function details(slug) {
  try {
    const res = await get(`${BASE}/wp-json/wc/store/v1/products?slug=${encodeURIComponent(slug)}`);
    const [p] = await res.json();
    if (!p) return null;
    return {
      name: decode(p.name),
      image: p.images?.[0]?.src ?? null,
      specs: Object.fromEntries((p.attributes ?? []).map((a) => [a.name, a.terms.map((t) => t.name).join(", ")])),
    };
  } catch {
    return null;
  }
}

async function main() {
  let supplier;
  try {
    supplier = parseSupplierPage(await (await get(PAGE)).text());
  } catch (err) {
    console.error(`No se pudo leer ${PAGE}: ${err.message}`);
    process.exit(2);
  }
  // Una página vacía casi seguro es un fallo del proveedor (caída, cambio de
  // plantilla), no un catálogo vacío: no lo damos por bueno.
  if (supplier.length < 3) {
    console.error(`La página del proveedor solo devuelve ${supplier.length} productos: posible cambio de plantilla. Revisar a mano.`);
    process.exit(2);
  }

  const ours = new Map(ALL_DEVICES.map((d) => [d.source, d]));
  const theirs = new Map(supplier.map((p) => [p.source, p]));

  const missing = supplier.filter((p) => !ours.has(p.source));
  const extra = ALL_DEVICES.filter((d) => !theirs.has(d.source));
  const priceDiffs = supplier
    .filter((p) => ours.has(p.source))
    .map((p) => ({ p, d: ours.get(p.source) }))
    .filter(({ p, d }) => p.priceTotal !== d.priceTotal || p.pricePay !== d.pricePay);

  console.log(`Proveedor: ${supplier.length} equipos · dinkbit: ${ALL_DEVICES.length} equipos`);

  if (!missing.length && !extra.length && !priceDiffs.length) {
    console.log("OK: el catálogo coincide exactamente.");
    return;
  }

  if (missing.length) {
    console.log(`\nFALTAN en dinkbit (${missing.length}):`);
    for (const p of missing) {
      const info = await details(p.source);
      console.log(`  + ${p.source}  ${p.priceTotal}€ / pagas ${p.pricePay}€`);
      if (info) {
        console.log(`      nombre: ${info.name}`);
        console.log(`      ficha:  ${JSON.stringify(info.specs)}`);
        console.log(`      imagen: ${info.image}`);
      }
    }
  }
  if (extra.length) {
    console.log(`\nSOBRAN en dinkbit (${extra.length}):`);
    for (const d of extra) console.log(`  - ${d.slug}  (ecomputer: ${d.source})`);
  }
  if (priceDiffs.length) {
    console.log(`\nPRECIOS distintos (${priceDiffs.length}):`);
    for (const { p, d } of priceDiffs)
      console.log(`  ~ ${d.slug}: dinkbit ${d.priceTotal}/${d.pricePay}€ -> ecomputer ${p.priceTotal}/${p.pricePay}€`);
  }
  process.exit(1);
}

main();
