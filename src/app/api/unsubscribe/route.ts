import { NextResponse, type NextRequest } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import { setLeadConsent } from "@/lib/imagina-leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function page(msg: string) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;background:#f1f5f9;color:#0f172a;text-align:center;padding:64px 20px;"><h1 style="font-size:22px;">${msg}</h1><p><a href="https://www.dinkbit.es" style="color:#187bef;">Volver a dinkbit.es</a></p></body>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!id || !verifyUnsubscribeToken(id, token)) {
    return page("Enlace de baja no válido o caducado.");
  }
  await setLeadConsent(id, false);
  return page("Te has dado de baja. No recibirás más comunicaciones. 👋");
}
