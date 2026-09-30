import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Hero } from "@/components/home/Hero";
import { PartnersMarquee } from "@/components/home/PartnersMarquee";
import { AboutFeatures } from "@/components/home/AboutFeatures";
import { KitDigitalSection } from "@/components/home/KitDigitalSection";
import { ServicesCarousel } from "@/components/home/ServicesCarousel";
import { HomeFaq } from "@/components/home/HomeFaq";
import { HOME_FAQS } from "@/lib/home-faqs";
import { Reveal } from "@/components/ui/Reveal";
import { getAllServices } from "@/lib/content";

export const metadata: Metadata = {
  title: "Agencia digital — desarrollo web, ecommerce, paid media y SEO",
  description:
    "Diseñamos y desarrollamos webs, ecommerce y campañas que convierten. Equipo multidisciplinar en Madrid y México con 15+ años creando marcas digitales que crecen.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "dinkbit — agencia digital en Madrid y México",
    description:
      "Web, ecommerce, paid media y SEO. Soluciones end-to-end para marcas que quieren crecer en digital.",
    url: "/",
  },
};

const Testimonials = dynamic(() =>
  import("@/components/home/Testimonials").then((m) => m.Testimonials),
);
const ContactSection = dynamic(() =>
  import("@/components/contacto/ContactSection").then((m) => m.ContactSection),
);

export default function Home() {
  const services = getAllServices().map((s) => ({
    slug: s.slug,
    title: s.title,
    shortDescription: s.shortDescription,
  }));

  /**
   * `FAQPage` de la portada, con las MISMAS preguntas que se pintan debajo.
   * Es de lo más citable que puede publicar una agencia: responde con datos
   * concretos —un año, una ciudad, una cifra— a lo que la gente le pregunta a
   * una IA sobre un proveedor antes de contactarlo.
   */
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }}
      />
      <Hero />
      <Reveal>
        <PartnersMarquee
          heading="Alianzas estratégicas"
          subheading="Trabajamos con quienes hacen posible el ecosistema digital"
        />
      </Reveal>
      <Reveal>
        <KitDigitalSection />
      </Reveal>
      <Reveal>
        <AboutFeatures />
      </Reveal>
      <Reveal>
        <ServicesCarousel services={services} />
      </Reveal>
      <Reveal>
        <Testimonials />
      </Reveal>
      <Reveal>
        <HomeFaq />
      </Reveal>
      <Reveal>
        <ContactSection />
      </Reveal>
    </>
  );
}
