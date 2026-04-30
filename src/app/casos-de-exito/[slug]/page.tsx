import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getAllCaseStudies, getCaseStudyBySlug } from "@/lib/content";
import { Tag } from "@/components/ui/Tag";
import { MDXRemote } from "next-mdx-remote-client/rsc";

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
  return { title: `${c.title} — dinkbit`, description: c.client };
}

export default async function CaseDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const caseStudy = getCaseStudyBySlug(slug);
  if (!caseStudy) notFound();

  return (
    <article>
      <header className="bg-slate-50 py-24">
        <Container>
          <div className="flex flex-wrap gap-1.5">
            {caseStudy.tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
            {caseStudy.title}
          </h1>
          <p className="mt-4 text-lg text-slate-600">{caseStudy.client}</p>
          {caseStudy.metricHeadline && (
            <p className="mt-6 text-2xl font-bold text-[--color-accent]">
              {caseStudy.metricHeadline}
            </p>
          )}
        </Container>
      </header>
      <Container className="prose prose-slate max-w-3xl py-16">
        <MDXRemote source={caseStudy.body} />
      </Container>
    </article>
  );
}
