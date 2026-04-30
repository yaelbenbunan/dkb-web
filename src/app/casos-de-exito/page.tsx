import { Container } from "@/components/ui/Container";
import { CaseFilters } from "@/components/casos/CaseFilters";
import { getAllCaseStudies, getAllServices } from "@/lib/content";

export const metadata = {
  title: "Casos de éxito — dinkbit",
  description:
    "Selección de proyectos y resultados conseguidos para nuestros clientes.",
};

export default function CasosPage() {
  const caseStudies = getAllCaseStudies();
  const serviceTags = getAllServices().map((s) => ({
    slug: s.slug,
    title: s.title,
  }));

  return (
    <Container className="py-24">
      <h1 className="text-4xl font-bold tracking-tight">Casos de éxito</h1>
      <p className="mt-4 max-w-2xl text-slate-600">
        Resultados reales de marcas con las que hemos trabajado.
      </p>
      <CaseFilters caseStudies={caseStudies} serviceTags={serviceTags} />
    </Container>
  );
}
