import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { Analytics } from "@/components/analytics/Analytics";
import { ChatGPTPixel } from "@/components/analytics/ChatGPTPixel";
import { GTM } from "@/components/analytics/GTM";
import { GTMNoScript } from "@/components/analytics/GTMNoScript";
import { LinkTracker } from "@/components/analytics/LinkTracker";
import { UtmCapture } from "@/components/analytics/UtmCapture";
import { CONTACT_INFO } from "@/lib/contact-info";
import { getAllServices } from "@/lib/content";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

const SITE_URL = "https://www.dinkbit.es";
const SITE_NAME = "dinkbit";
const SITE_TITLE = "dinkbit — agencia digital";
const SITE_DESCRIPTION =
  "Agencia de marketing digital en España. Desarrollo web, ecommerce, paid media, SEO y más.";

export const metadata: Metadata = {
  title: {
    default: SITE_TITLE,
    template: "%s — dinkbit",
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
    languages: {
      "es-ES": "/",
      "es-MX": "/nosotros/mexico",
    },
  },
  applicationName: SITE_NAME,
  authors: [{ name: "dinkbit" }],
  creator: "dinkbit",
  publisher: "dinkbit",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    alternateLocale: ["es_MX"],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/img/share-image.png",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/img/share-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // TODO: pegar el código real desde Google Search Console (Configuración → Verificación)
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    // TODO: pegar el código real desde Bing Webmaster Tools
    other: {
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ?? "",
    },
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  // `ProfessionalService` en vez de `Organization` a secas: es un subtipo suyo,
  // así que no se pierde nada, y además admite teléfono, dirección y zona de
  // servicio como propiedades de primera. Los buscadores con IA construyen la
  // ficha de un negocio a partir de eso.
  "@type": "ProfessionalService",
  // Ancla de la entidad. Que todos los esquemas del sitio apunten al MISMO `@id`
  // es lo que permite a un buscador entender que el proveedor del servicio, el
  // autor del artículo y la empresa de la portada son la misma cosa, en vez de
  // tres organizaciones que se llaman igual.
  "@id": `${SITE_URL}/#organizacion`,
  name: "dinkbit",
  legalName: "Dinkbit Marketing S.L.",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  image: `${SITE_URL}/icon.png`,
  description: SITE_DESCRIPTION,
  foundingDate: "2010",
  // Los datos de contacto salen de CONTACT_INFO, que es la fuente que usan el
  // pie del sitio, la página de contacto y los correos. Estaban duplicados a
  // mano y habían divergido: aquí figuraba `admin-es@dinkbit.com` mientras el
  // sitio entero publicaba `hola@dinkbit.es`. Para una IA que cruza fuentes,
  // dos correos distintos para la misma empresa es justo la señal que hace que
  // no se fíe de ninguno.
  email: CONTACT_INFO.email,
  telephone: CONTACT_INFO.phoneE164,
  areaServed: ["ES", "MX"],
  address: [
    {
      "@type": "PostalAddress",
      streetAddress: "Calle Fuerteventura 4, Piso 3 — Oficina 2",
      addressLocality: "San Sebastián de los Reyes",
      addressRegion: "Madrid",
      postalCode: "28703",
      addressCountry: "ES",
    },
  ],
  // `knowsAbout` es de las pocas propiedades que un modelo puede leer como «de
  // esto sabe»: se deriva de los servicios publicados para que no se quede
  // contando un catálogo que ya cambió.
  knowsAbout: getAllServices().map((s) => s.title),
  // Cuantos más perfiles verificables, más fácil es para una IA confirmar que
  // habla del dinkbit correcto y no de otro negocio con nombre parecido.
  sameAs: [
    CONTACT_INFO.socials.linkedin,
    CONTACT_INFO.socials.instagram,
    CONTACT_INFO.socials.tiktok,
    CONTACT_INFO.address.mapsUrl,
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "es-ES",
  // Apunta al `@id` de arriba en vez de repetir el nombre: así el sitio y la
  // empresa son la misma entidad y no dos sueltas que coinciden en el nombre.
  publisher: { "@id": `${SITE_URL}/#organizacion` },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={sourceSans.variable}
      data-theme="dark"
      suppressHydrationWarning
    >
      <head>
        {/* Aplica el tema desde localStorage antes del paint para evitar flash */}
        <script src="/theme-bootstrap.js" />
        <GTM />
      </head>
      <body>
        <script
        id="ld-organization" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, "\\u003c") }}
      />
        <script
        id="ld-website" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema).replace(/</g, "\\u003c") }}
      />
        <GTMNoScript />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
        >
          Saltar al contenido
        </a>
        <ScrollProgress />
        {children}
        <CookieBanner />
        <Analytics />
        <ChatGPTPixel />
        <LinkTracker />
        <UtmCapture />
      </body>
    </html>
  );
}
