import type { Metadata } from "next";
import { MarketingLandingPage } from "@/components/marketing/MarketingLanding";
import { MARKETING_CLINICAS } from "@/lib/marketing-landings";

export const metadata: Metadata = {
  title: MARKETING_CLINICAS.metaTitle,
  description: MARKETING_CLINICAS.metaDescription,
  alternates: { canonical: MARKETING_CLINICAS.path },
  openGraph: {
    type: "website",
    url: MARKETING_CLINICAS.path,
    title: MARKETING_CLINICAS.metaTitle,
    description: MARKETING_CLINICAS.metaDescription,
    siteName: "dinkbit",
  },
};

export default function MarketingClinicasPage() {
  return <MarketingLandingPage landing={MARKETING_CLINICAS} />;
}
