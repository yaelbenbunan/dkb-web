import type { Metadata } from "next";
import { WebExpressLandingPage } from "@/components/web-express/WebExpressLanding";
import { WEB_CLINICAS_ESTETICAS } from "@/lib/web-express-landings";

export const metadata: Metadata = {
  title: WEB_CLINICAS_ESTETICAS.metaTitle,
  description: WEB_CLINICAS_ESTETICAS.metaDescription,
  alternates: { canonical: WEB_CLINICAS_ESTETICAS.path },
  openGraph: {
    type: "website",
    url: WEB_CLINICAS_ESTETICAS.path,
    title: WEB_CLINICAS_ESTETICAS.metaTitle,
    description: WEB_CLINICAS_ESTETICAS.metaDescription,
    siteName: "dinkbit",
  },
};

export default function WebParaClinicasEsteticasPage() {
  return <WebExpressLandingPage landing={WEB_CLINICAS_ESTETICAS} />;
}
