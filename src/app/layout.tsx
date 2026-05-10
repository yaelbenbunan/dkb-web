import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { Analytics } from "@/components/analytics/Analytics";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

const SITE_URL = "https://dinkbit.es";
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
      </head>
      <body>
        <ScrollProgress />
        <Header />
        <main className="min-h-[calc(100vh-5rem)]">{children}</main>
        <Footer />
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  );
}
