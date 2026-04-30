import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { CaseHeader } from "@/components/casos/CaseHeader";
import { CaseSections } from "@/components/casos/CaseSections";
import { RelatedCases } from "@/components/casos/RelatedCases";
import {
  getAllCaseStudies,
  getCaseStudyBySlug,
  getRelatedCases,
  getAllServices,
} from "@/lib/content";

export async function generateStaticParams() {
  return getAllCaseStudies().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getCaseStudyBySlug(slug);
  if (!c) return {};
  return {
    title: `${c.title} — dinkbit`,
    description: c.description ?? c.client,
  };
}

export default async function CaseDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const caseStudy = getCaseStudyBySlug(slug);
  if (!caseStudy) notFound();

  const related = getRelatedCases(slug, 4);
  const serviceTitleBySlug = Object.fromEntries(
    getAllServices().map((s) => [s.slug, s.title]),
  );

  return (
    <article>
      <CaseHeader
        caseStudy={caseStudy}
        serviceTitleBySlug={serviceTitleBySlug}
      />

      {/* Reto */}
      {caseStudy.reto && (
        <section className="border-b border-[--color-border] py-20 md:py-24">
          <Container>
            <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-start lg:gap-16">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[--color-accent]">
                El reto
              </p>
              <p className="max-w-3xl text-xl leading-relaxed text-[--color-fg] md:text-2xl">
                {caseStudy.reto}
              </p>
            </div>
          </Container>
        </section>
      )}

      {/* Soluciones por servicio */}
      {caseStudy.sections && caseStudy.sections.length > 0 && (
        <CaseSections sections={caseStudy.sections} />
      )}

      <RelatedCases cases={related} />
    </article>
  );
}
