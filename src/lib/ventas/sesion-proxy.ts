import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ventasAuthConfig } from "./auth-config";

/**
 * Parte del proxy para /panel/ventas: refresca la sesión de Supabase (reescribe
 * sus cookies si ha caducado el token) y manda al login a quien no la tenga.
 * Es solo la primera barrera: cada página y cada acción vuelve a comprobar la
 * usuaria y su perfil con `requireUsuaria`.
 */
export async function proxyVentas(req: NextRequest, esLogin: boolean): Promise<NextResponse> {
  let respuesta = NextResponse.next({ request: req });
  const config = ventasAuthConfig();
  if (!config) return esLogin ? respuesta : alLogin(req);

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      // `@supabase/ssr` 0.12 pasa un segundo argumento `headers` (cache
      // headers para que el refresco del token no se sirva desde una CDN a
      // otra usuaria): se reenvían a la respuesta además de las cookies.
      setAll: (cookies, headers) => {
        cookies.forEach(({ name, value }) => req.cookies.set(name, value));
        respuesta = NextResponse.next({ request: req });
        cookies.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => respuesta.headers.set(key, value));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  if (esLogin || data.user) return respuesta;
  return alLogin(req);
}

function alLogin(req: NextRequest): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/panel/ventas/login";
  url.search = "";
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}
