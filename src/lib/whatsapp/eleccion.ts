/**
 * Qué guion sigue un lead. Primero la secuencia activa que declare servir a su
 * anuncio; si ninguna lo cubre, la activa que no declara anuncios (la general
 * de la marca).
 *
 * Esta distinción existe porque `activarSecuencia` archiva las demás activas
 * de la marca: sin ella, activar la campaña de dental dejaría a los leads de
 * psicología sin guion.
 *
 * Genérica a propósito: recibe las secuencias ya cargadas (de eso se encarga
 * otra tarea) y solo decide, sin tocar Supabase ni red.
 */
export function elegirSecuencia<T extends { estado: string; anuncios: string[] }>(
  secuencias: T[],
  anuncio: string | null,
): T | null {
  const activas = secuencias.filter((s) => s.estado === "activa");
  const delAnuncio = anuncio ? activas.find((s) => s.anuncios.includes(anuncio)) : undefined;
  return delAnuncio ?? activas.find((s) => s.anuncios.length === 0) ?? null;
}
