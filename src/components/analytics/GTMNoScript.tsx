"use client";

import { usePathname } from "next/navigation";
import { GTM_ID } from "@/lib/gtm";
import { esRutaSinAnalitica } from "@/lib/rutas-sin-analitica";

/** Cliente y no servidor a propósito: así decide él mismo por la ruta y, en
 *  /alta, ni el iframe ni el id de GTM viajan en la respuesta. */
export function GTMNoScript() {
  const pathname = usePathname();
  if (!GTM_ID || esRutaSinAnalitica(pathname)) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
