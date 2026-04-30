import { Container } from "@/components/ui/Container";
import { CaseFilters } from "@/components/casos/CaseFilters";
import { getAllCaseStudies } from "@/lib/content";

export const metadata = {
  title: "Casos de éxito — dinkbit",
  description:
    "Selección de proyectos y resultados conseguidos para nuestros clientes.",
};

export default function CasosPage() {
  const caseStudies = getAllCaseStudies();

  return (
    <>
      <header className="relative isolate overflow-hidden py-28 md:py-36">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
          style={{ ["--sx" as string]: "30%", ["--sy" as string]: "30%" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-40 fade-edges-y"
        />
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[--color-accent]">
            Casos de éxito
          </p>
          <h1
            className="mt-8 max-w-5xl font-black leading-[0.92] tracking-tight"
            style={{ fontSize: "var(--text-display-xl)" }}
          >
            Resultados{" "}
            <span className="italic text-[--color-accent]">reales</span>{" "}
            de marcas como la tuya.
          </h1>
        </Container>
      </header>
      <Container className="py-20">
        <CaseFilters caseStudies={caseStudies} />
      </Container>
    </>
  );
}
