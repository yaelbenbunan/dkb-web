/** Respuesta de las server actions del CRM de leads que necesitan devolver algo
 *  más que nada (el tablero, para poder deshacer la actualización optimista si
 *  falla). Vive fuera de `actions.ts` porque los ficheros "use server" solo
 *  pueden exportar funciones asíncronas. */
export type ResultadoAccion = { ok: true; mensaje?: string } | { ok: false; error: string };
