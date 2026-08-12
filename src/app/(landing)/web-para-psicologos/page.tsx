import type { Metadata } from "next";
import { WebExpressLandingPage } from "@/components/web-express/WebExpressLanding";
import { WEB_PSICOLOGOS } from "@/lib/web-express-landings";

export const metadata: Metadata = {
  title: WEB_PSICOLOGOS.metaTitle,
  description: WEB_PSICOLOGOS.metaDescription,
  alternates: { canonical: WEB_PSICOLOGOS.path },
  openGraph: {
    type: "website",
    url: WEB_PSICOLOGOS.path,
    title: WEB_PSICOLOGOS.metaTitle,
    description: WEB_PSICOLOGOS.metaDescription,
    siteName: "dinkbit",
  },
};

export default function WebParaPsicologosPage() {
  return <WebExpressLandingPage landing={WEB_PSICOLOGOS} />;
}
