import { Hero } from "@/components/home/Hero";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { FeaturedCases } from "@/components/home/FeaturedCases";
import { ContactCTA } from "@/components/home/ContactCTA";

export default function Home() {
  return (
    <>
      <Hero />
      <ServicesGrid />
      <FeaturedCases />
      <ContactCTA />
    </>
  );
}
