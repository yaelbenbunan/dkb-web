import type { Metadata } from "next";
import { Web299LandingPage } from "@/components/web-299/Web299Landing";
import {
  WEB_299_DAYS,
  WEB_299_FAQS,
  WEB_299_META_DESCRIPTION,
  WEB_299_META_TITLE,
  WEB_299_PATH,
  WEB_299_PRICE,
} from "@/lib/web-299";

const SITE_URL = "https://www.dinkbit.es";

export const metadata: Metadata = {
  title: WEB_299_META_TITLE,
  description: WEB_299_META_DESCRIPTION,
  alternates: { canonical: WEB_299_PATH },
  openGraph: {
    type: "website",
    url: WEB_299_PATH,
    title: WEB_299_META_TITLE,
    description: WEB_299_META_DESCRIPTION,
    siteName: "dinkbit",
  },
};

/**
 * Datos estructurados de la landing.
 *
 * Es la página del sitio con más posibilidades de acabar citada por una IA,
 * porque responde con un número a una pregunta que la gente hace tal cual:
 * «¿cuánto cuesta una página web?». Un modelo puede leerlo del texto, pero el
 * `Offer` con su precio y su moneda lo deja sin ambigüedad — y sin ambigüedad es
 * cuando se atreve a decir la cifra en vez de responder «depende».
 *
 * El precio se toma de `WEB_299_PRICE`, la misma constante que pinta la página,
 * así que no pueden decir cosas distintas. Se le quita el símbolo porque
 * schema.org quiere el número a secas y la moneda en su campo.
 */
const servicioSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Página web por 299€",
  serviceType: "Diseño y desarrollo de páginas web",
  description: WEB_299_META_DESCRIPTION,
  url: `${SITE_URL}${WEB_299_PATH}`,
  areaServed: "ES",
  // Apunta al `@id` de la organización del layout: así el proveedor es la misma
  // entidad que la empresa, y no una organización suelta con el mismo nombre.
  provider: { "@id": `${SITE_URL}/#organizacion` },
  offers: {
    "@type": "Offer",
    price: WEB_299_PRICE.replace("€", ""),
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    url: `${SITE_URL}${WEB_299_PATH}`,
    description: `Pago único por el desarrollo. Alojamiento y dominio aparte. Entrega en ${WEB_299_DAYS} días laborables.`,
  },
};

/** Las FAQs ya están escritas para la página; emitirlas también como datos
 *  estructurados es lo que hace que una IA pueda citar la respuesta entera en
 *  vez de reconstruirla del texto corrido. */
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: WEB_299_FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function Web299Page() {
  return (
    <>
      <script
        id="ld-web-299-servicio" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicioSchema).replace(/</g, "\\u003c") }}
      />
      <script
        id="ld-web-299-faq" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }}
      />
      <Web299LandingPage />
    </>
  );
}
