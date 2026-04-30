import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { CaseCard } from "@/components/casos/CaseCard";
import { getAllCaseStudies } from "@/lib/content";

export function FeaturedCases() {
  const cases = getAllCaseStudies().slice(0, 3);
  if (cases.length === 0) return null;
  return (
    <section className="bg-[--color-bg-subtle] py-24">
      <Container>
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Casos de éxito
          </h2>
          <Link
            href="/casos-de-exito"
            className="text-sm font-medium text-[--color-accent] hover:text-[--color-accent-hover]"
          >
            Ver todos →
          </Link>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <CaseCard key={c.slug} caseStudy={c} />
          ))}
        </div>
      </Container>
    </section>
  );
}
