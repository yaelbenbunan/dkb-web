/** Respuesta de las server actions del módulo de ventas. Vive fuera de los
 *  ficheros "use server", que solo pueden exportar funciones asíncronas. */
export type ResultadoAccion = { ok: true; mensaje?: string } | { ok: false; error: string };
