import { Hero } from "@/components/home/Hero";
import { PartnersMarquee } from "@/components/home/PartnersMarquee";
import { AboutFeatures } from "@/components/home/AboutFeatures";
import { ServicesCarousel } from "@/components/home/ServicesCarousel";
import { Testimonials } from "@/components/home/Testimonials";
import { ContactSection } from "@/components/contacto/ContactSection";
import { Reveal } from "@/components/ui/Reveal";
import { getAllServices } from "@/lib/content";

export default function Home() {
  const services = getAllServices().map((s) => ({
    slug: s.slug,
    title: s.title,
    shortDescription: s.shortDescription,
  }));

  return (
    <>
      <Hero />
      <Reveal>
        <PartnersMarquee
          heading="Alianzas estratégicas"
          subheading="Trabajamos con quienes hacen posible el ecosistema digital"
        />
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
        <ContactSection />
      </Reveal>
    </>
  );
}
