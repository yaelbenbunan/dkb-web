import type { Metadata } from "next";
import { LandingProveedoresDeportivos } from "@/components/proveedores-deportivos/Secciones";
import { PD_FAQS, PD_META_DESCRIPTION, PD_META_TITLE, PD_PATH, PD_PRECIO_NUMERO } from "@/lib/proveedores-deportivos";

const SITE_URL = "https://www.dinkbit.es";

export const metadata: Metadata = {
  title: PD_META_TITLE,
  description: PD_META_DESCRIPTION,
  alternates: { canonical: PD_PATH },
  openGraph: {
    type: "website",
    url: PD_PATH,
    title: PD_META_TITLE,
    description: PD_META_DESCRIPTION,
    siteName: "dinkbit",
    images: ["/img/deporte/pista-padel.webp"],
  },
};

/** Precio mensual sin IVA, con la misma constante que pinta la página. */
const servicioSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Pack Campaña + CRM para proveedores deportivos",
  serviceType: "Captación de clientes con Meta Ads y CRM",
  description: PD_META_DESCRIPTION,
  url: `${SITE_URL}${PD_PATH}`,
  areaServed: "ES",
  provider: { "@id": `${SITE_URL}/#organizacion` },
  offers: {
    "@type": "Offer",
    price: PD_PRECIO_NUMERO,
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    url: `${SITE_URL}${PD_PATH}`,
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: PD_PRECIO_NUMERO,
      priceCurrency: "EUR",
      unitText: "MONTH",
      valueAddedTaxIncluded: false,
    },
  },
};

/** Solo las preguntas con respuesta real: un placeholder no es una respuesta que citar. */
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: PD_FAQS.filter((f) => f.a !== null).map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function ProveedoresDeportivosPage() {
  return (
    <>
      <script
        id="ld-pd-servicio"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicioSchema).replace(/</g, "\\u003c") }}
      />
      <script
        id="ld-pd-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }}
      />
      <LandingProveedoresDeportivos />
    </>
  );
}
