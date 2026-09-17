/** URL y clave publicable para Supabase Auth. Sin ellas nadie puede entrar
 *  en /panel/ventas (se falla cerrado, nunca abierto). */
export function ventasAuthConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}
