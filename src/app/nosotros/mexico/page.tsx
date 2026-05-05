import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { TeamGridMexico } from "@/components/nosotros/TeamGrid";

export const metadata = {
  title: "Equipo en México — dinkbit",
  description:
    "Conoce al equipo de dinkbit en México: especialistas in-house en desarrollo, paid media, SEO y diseño.",
};

export default function NosotrosMexicoPage() {
  return (
    <>
      <header className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 60% 70% at 25% 30%, rgba(58,144,242,0.28), transparent 65%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-25 fade-edges-y"
        />

        <Container className="relative py-20 md:py-24">
          <Link
            href="/nosotros"
            className="inline-flex items-center gap-2 text-sm font-medium text-fg-muted transition-colors hover:text-accent"
          >
            <span aria-hidden>←</span> Volver a Nosotros
          </Link>
          <h1
            className="mt-8 max-w-4xl font-black leading-[0.95] tracking-tight"
            style={{ fontSize: "var(--text-display-lg)" }}
          >
            Equipo en{" "}
            <span className="italic text-[#3a90f2]">México</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-fg-muted">
            Casi cuatro decenas de personas trabajando in-house desde Ciudad de
            México. Aquí están las caras detrás de cada proyecto que cruza el
            charco.
          </p>
        </Container>

        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#187bef] to-transparent"
        />
      </header>

      <TeamGridMexico />
    </>
  );
}
