import { Container } from "@/components/ui/Container";
import { WhyUs } from "@/components/nosotros/WhyUs";
import { Counters } from "@/components/nosotros/Counters";
import { PartnersMarquee } from "@/components/home/PartnersMarquee";
import { TeamGrid } from "@/components/nosotros/TeamGrid";

export const metadata = {
  title: "Nosotros — dinkbit",
  description:
    "Equipo multidisciplinar con 15+ años de experiencia. Diseño, desarrollo, paid media y SEO bajo el mismo techo.",
};

export default function NosotrosPage() {
  return (
    <>
      <header className="border-b border-[--color-border] bg-[--color-bg-subtle] py-20 md:py-24">
        <Container>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[--color-accent]">
            Nosotros
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Una agencia digital,{" "}
            <span className="text-[--color-accent]">hecha para construir.</span>
          </h1>
        </Container>
      </header>
      <WhyUs />
      <Counters />
      <PartnersMarquee />
      <TeamGrid />
    </>
  );
}
