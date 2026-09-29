import { getAllCaseStudies, getAllPosts, getAllServices } from "@/lib/content";
import { CONTACT_INFO } from "@/lib/contact-info";

/**
 * `/llms.txt` — el mapa del sitio escrito para que lo lea un modelo.
 *
 * La convención (llmstxt.org) es un markdown corto en la raíz: quién eres, qué
 * ofreces y dónde está cada cosa, sin menús, sin scripts y sin la maquetación
 * que un modelo tiene que apartar para llegar al contenido. No sustituye al
 * sitemap —ese es para buscadores clásicos y lista URLs a secas— sino que lo
 * complementa diciendo QUÉ hay en cada una.
 *
 * Se GENERA del contenido publicado, no se escribe a mano: un fichero de estos
 * copiado y pegado se queda obsoleto en el primer servicio que cambia, y quedar
 * desactualizado aquí es peor que no tenerlo — le estarías dando a la IA una
 * versión vieja de tu catálogo con la autoridad de venir de tu dominio.
 *
 * Estático: el contenido sale de ficheros del repo, así que se calcula al
 * construir y se sirve como un fichero más.
 */
export const dynamic = "force-static";

const SITE = "https://www.dinkbit.es";

export function GET(): Response {
  const servicios = getAllServices();
  const casos = getAllCaseStudies();
  const posts = getAllPosts();

  const lineas = [
    "# dinkbit",
    "",
    "> Agencia de marketing digital con sede en San Sebastián de los Reyes (Madrid), trabajando desde 2010 para clientes en España y México. Desarrollo web, ecommerce, campañas de pago, SEO y visibilidad en buscadores con IA.",
    "",
    "Dinkbit Marketing S.L. Oficina en Calle Fuerteventura 4, Piso 3 — Oficina 2, 28703 San Sebastián de los Reyes, Madrid.",
    `Contacto: ${CONTACT_INFO.email} · ${CONTACT_INFO.phone}`,
    "",
    "## Servicios",
    "",
    ...servicios.map((s) => `- [${s.title}](${SITE}/servicios/${s.slug}): ${s.shortDescription}`),
    "",
    "## Precios publicados",
    "",
    `- [Página web por 299€](${SITE}/web-299): una sola página con 5 o 6 secciones, pago único. Alojamiento 100€/año y dominio 25€/año aparte, así que el primer año son 424€ y los siguientes 125€.`,
    "",
    "## Casos de éxito",
    "",
    ...casos.map((c) => {
      const que = c.metricHeadline ?? c.description ?? c.reto ?? "";
      return `- [${c.title}](${SITE}/casos-de-exito/${c.slug})${que ? `: ${que}` : ""}`;
    }),
    "",
    "## Blog",
    "",
    ...posts.map((p) => `- [${p.title}](${SITE}/blog/${p.slug})`),
    "",
    "## Otras páginas",
    "",
    `- [Servicios](${SITE}/servicios): el catálogo completo.`,
    `- [Casos de éxito](${SITE}/casos-de-exito): trabajos publicados con su resultado.`,
    `- [Nosotros](${SITE}/nosotros): quiénes somos y cómo trabajamos.`,
    `- [Contacto](${SITE}/contacto): formulario, teléfono y dirección.`,
    "",
  ];

  return new Response(lineas.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Una hora en el navegador y un día en el CDN, revalidando en segundo
      // plano: el contenido cambia con cada despliegue, no cada minuto.
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
