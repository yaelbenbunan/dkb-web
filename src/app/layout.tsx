import type { Metadata } from "next";
import Script from "next/script";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { Analytics } from "@/components/analytics/Analytics";
import { GTM } from "@/components/analytics/GTM";
import { GTMNoScript } from "@/components/analytics/GTMNoScript";
import { LinkTracker } from "@/components/analytics/LinkTracker";
import { WhatsAppBubble } from "@/components/layout/WhatsAppBubble";

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
        url: "/opengraph-image",
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
    images: ["/opengraph-image"],
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
  "@type": "Organization",
  name: "dinkbit",
  legalName: "Dinkbit Marketing S.L.",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  description: SITE_DESCRIPTION,
  foundingDate: "2010",
  email: "admin-es@dinkbit.com",
  areaServed: ["ES", "MX"],
  address: [
    {
      "@type": "PostalAddress",
      streetAddress: "C/ Fuerteventura 4, Planta 3, Oficina 2",
      addressLocality: "San Sebastián de los Reyes",
      addressRegion: "Madrid",
      postalCode: "28703",
      addressCountry: "ES",
    },
  ],
  sameAs: [
    "https://www.linkedin.com/company/dinkbit",
    "https://www.instagram.com/dinkbit",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "es-ES",
  publisher: { "@type": "Organization", name: "dinkbit" },
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
        <Script
          id="ld-organization"
          type="application/ld+json"
          strategy="beforeInteractive"
        >
          {JSON.stringify(organizationSchema).replace(/</g, "\\u003c")}
        </Script>
        <Script
          id="ld-website"
          type="application/ld+json"
          strategy="beforeInteractive"
        >
          {JSON.stringify(websiteSchema).replace(/</g, "\\u003c")}
        </Script>
        <GTMNoScript />
        <ScrollProgress />
        <Header />
        <main className="min-h-[calc(100vh-5rem)]">{children}</main>
        <Footer />
        <WhatsAppBubble />
        <CookieBanner />
        <Analytics />
        <LinkTracker />
      </body>
    </html>
  );
}
