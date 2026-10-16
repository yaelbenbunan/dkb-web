/**
 * Provincias españolas por los dos primeros dígitos del código postal.
 *
 * Overture casi nunca trae la provincia (`addresses[].region` viene vacío en
 * España), pero el código postal sí, y en España sus dos primeros dígitos son
 * el código de la provincia. Puro y con imports relativos (ver `contacto.ts`).
 */
import { claveTexto } from "./contacto.ts";

export const PROVINCIAS: Record<string, string> = {
  "01": "Araba/Álava", "02": "Albacete", "03": "Alicante", "04": "Almería", "05": "Ávila",
  "06": "Badajoz", "07": "Illes Balears", "08": "Barcelona", "09": "Burgos", "10": "Cáceres",
  "11": "Cádiz", "12": "Castellón", "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña",
  "16": "Cuenca", "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Gipuzkoa",
  "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León", "25": "Lleida",
  "26": "La Rioja", "27": "Lugo", "28": "Madrid", "29": "Málaga", "30": "Murcia",
  "31": "Navarra", "32": "Ourense", "33": "Asturias", "34": "Palencia", "35": "Las Palmas",
  "36": "Pontevedra", "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria", "40": "Segovia",
  "41": "Sevilla", "42": "Soria", "43": "Tarragona", "44": "Teruel", "45": "Toledo",
  "46": "Valencia", "47": "Valladolid", "48": "Bizkaia", "49": "Zamora", "50": "Zaragoza",
  "51": "Ceuta", "52": "Melilla",
};

/** Otros nombres con los que se escribe una provincia. */
const ALIAS: Record<string, string> = {
  alava: "01", araba: "01", alicante: "03", alacant: "03", baleares: "07", "islas baleares": "07",
  "illes balears": "07", mallorca: "07", castellon: "12", "castello": "12", "la coruna": "15", coruna: "15",
  "a coruna": "15", gerona: "17", guipuzcoa: "20", gipuzkoa: "20", lerida: "25", orense: "32",
  "gran canaria": "35", tenerife: "38", vizcaya: "48", bizkaia: "48", navarra: "31", nafarroa: "31",
  "comunidad de madrid": "28", "region de murcia": "30", "principado de asturias": "33",
  valencia: "46", "valencia/valencia": "46",
};

const POR_CLAVE: Record<string, string> = Object.fromEntries([
  ...Object.entries(PROVINCIAS).map(([codigo, nombre]) => [claveTexto(nombre), codigo]),
  ...Object.entries(ALIAS),
]);

export function provinciaDeCp(cp: string | null | undefined): string | null {
  const limpio = (cp ?? "").trim();
  if (!/^\d{5}$/.test(limpio)) return null;
  return PROVINCIAS[limpio.slice(0, 2)] ?? null;
}

/** La provincia que alguien ha escrito, con su nombre oficial; null si no lo es. */
export function provinciaDeTexto(texto: string): string | null {
  const codigo = POR_CLAVE[claveTexto(texto)];
  return codigo ? PROVINCIAS[codigo] : null;
}

/** Código de dos dígitos de una provincia escrita a mano; null si no lo es. */
export function codigoDeProvincia(texto: string): string | null {
  return POR_CLAVE[claveTexto(texto)] ?? null;
}
