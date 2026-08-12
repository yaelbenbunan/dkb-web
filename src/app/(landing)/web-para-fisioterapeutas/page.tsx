import type { Metadata } from "next";
import { WebExpressLandingPage } from "@/components/web-express/WebExpressLanding";
import { WEB_FISIOTERAPEUTAS } from "@/lib/web-express-landings";

export const metadata: Metadata = {
  title: WEB_FISIOTERAPEUTAS.metaTitle,
  description: WEB_FISIOTERAPEUTAS.metaDescription,
  alternates: { canonical: WEB_FISIOTERAPEUTAS.path },
  openGraph: {
    type: "website",
    url: WEB_FISIOTERAPEUTAS.path,
    title: WEB_FISIOTERAPEUTAS.metaTitle,
    description: WEB_FISIOTERAPEUTAS.metaDescription,
    siteName: "dinkbit",
  },
};

export default function WebParaFisioterapeutasPage() {
  return <WebExpressLandingPage landing={WEB_FISIOTERAPEUTAS} />;
}
