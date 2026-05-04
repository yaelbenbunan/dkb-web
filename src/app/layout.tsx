import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "dinkbit — agencia digital",
  description:
    "Agencia de marketing digital en España. Desarrollo web, ecommerce, paid media, SEO y más.",
  metadataBase: new URL("https://dinkbit.es"),
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
        <Header />
        <main className="min-h-[calc(100vh-5rem)]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
