import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

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
    <html lang="es" className={sourceSans.variable}>
      <body>{children}</body>
    </html>
  );
}
