import type { Metadata } from "next";
import { PromoWizard } from "./_components/PromoWizard";

export const metadata: Metadata = {
  title: "Cuéntanos sobre tu negocio · Promo Verano -50% | dinkbit",
  description: "Responde unas preguntas y ponemos en marcha tu web o ecommerce con el 50% de descuento de verano.",
  robots: { index: false, follow: false },
};

export default async function PromoQuestionnairePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; lid?: string; em?: string }>;
}) {
  const { t = "", lid = "", em = "" } = await searchParams;
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <PromoWizard token={t} leadId={lid} email={em} />
    </section>
  );
}
