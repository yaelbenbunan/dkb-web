import { Hero } from "@/components/home/Hero";
import { PartnersMarquee } from "@/components/home/PartnersMarquee";
import { AboutFeatures } from "@/components/home/AboutFeatures";
import { ServicesCarousel } from "@/components/home/ServicesCarousel";
import { Testimonials } from "@/components/home/Testimonials";
import { ContactSection } from "@/components/contacto/ContactSection";
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
      <PartnersMarquee
        heading="Alianzas estratégicas"
        subheading="Trabajamos con quienes hacen posible el ecosistema digital"
      />
      <AboutFeatures />
      <ServicesCarousel services={services} />
      <Testimonials />
      <ContactSection />
    </>
  );
}
