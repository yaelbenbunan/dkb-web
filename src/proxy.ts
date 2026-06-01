import { NextResponse, type NextRequest } from "next/server";
import { PANEL_COOKIE, verifySessionToken } from "@/lib/panel-auth";

// Protect every /panel route (except the login page + its assets). Unauthenticated
// requests are redirected to the login form. (Next 16 "proxy" convention.)
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/panel/login")) return NextResponse.next();

  const token = req.cookies.get(PANEL_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/panel/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/panel/:path*"],
};
