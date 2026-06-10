import type { Metadata } from "next";
import { MarketingLandingPage } from "@/components/marketing/MarketingLanding";
import { MARKETING_NEGOCIOS } from "@/lib/marketing-landings";

export const metadata: Metadata = {
  title: MARKETING_NEGOCIOS.metaTitle,
  description: MARKETING_NEGOCIOS.metaDescription,
  alternates: { canonical: MARKETING_NEGOCIOS.path },
  openGraph: {
    type: "website",
    url: MARKETING_NEGOCIOS.path,
    title: MARKETING_NEGOCIOS.metaTitle,
    description: MARKETING_NEGOCIOS.metaDescription,
    siteName: "dinkbit",
  },
};

export default function MarketingNegociosPage() {
  return <MarketingLandingPage landing={MARKETING_NEGOCIOS} />;
}
