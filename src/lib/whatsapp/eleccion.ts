/**
 * Qué guion sigue un lead. Primero la secuencia activa que declare servir a su
 * anuncio; si ninguna lo cubre, la activa que no declara anuncios (la general
 * de la marca).
 *
 * Esta distinción es la que permite tener dos campañas vivas a la vez bajo la
 * misma marca: `activarSecuencia` (`ventas/servicios.ts`) solo archiva las
 * activas que COMPITEN por los mismos anuncios, así que dental y psicología
 * pueden estar activas y cada lead encuentra la suya. Las dos funciones tienen
 * que decir lo mismo, así que si se cambia el criterio aquí hay que cambiar
 * `compitenPorAnuncios` allí.
 *
 * Genérica a propósito: recibe las secuencias ya cargadas (de eso se encarga
 * otra tarea) y solo decide, sin tocar Supabase ni red.
 *
 * Si dos secuencias activas declaran el mismo anuncio —no debería pasar si
 * `activarSecuencia` hace bien su trabajo, pero esta función no lo puede
 * comprobar— gana la primera del array. El orden lo decide quien cargue las
 * filas (la tarea 6), no esta función.
 *
 * `anuncios` se lee con `?? []`: las migraciones de este proyecto se aplican a
 * mano y `listSecuencias` hace `select("*")`, así que en una base donde la
 * columna todavía no existe la fila llega SIN el campo. Sin esta defensa,
 * `s.anuncios.includes(...)` lanzaría un TypeError y el lead recibiría el
 * respaldo genérico en vez de su guion, con un solo `console.error` de rastro.
 * Una fila sin la columna se trata como comodín, que es lo que era antes de que
 * la columna existiera — el mismo criterio que usa `compitenPorAnuncios`.
 */
export function elegirSecuencia<T extends { estado: string; anuncios: string[] }>(
  secuencias: T[],
  anuncio: string | null,
): T | null {
  const activas = secuencias.filter((s) => s.estado === "activa");
  const anunciosDe = (s: T): string[] => s.anuncios ?? [];
  const delAnuncio = anuncio ? activas.find((s) => anunciosDe(s).includes(anuncio)) : undefined;
  return delAnuncio ?? activas.find((s) => anunciosDe(s).length === 0) ?? null;
}
