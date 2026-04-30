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
      <header className="border-b border-[--color-border] bg-[--color-bg-subtle] py-20 md:py-24">
        <Container>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[--color-accent]">
            Casos de éxito
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Resultados reales de marcas{" "}
            <span className="text-[--color-accent]">como la tuya.</span>
          </h1>
        </Container>
      </header>
      <Container className="py-20">
        <CaseFilters caseStudies={caseStudies} />
      </Container>
    </>
  );
}
