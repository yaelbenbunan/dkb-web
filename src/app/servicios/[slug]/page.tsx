import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getAllServices, getServiceBySlug } from "@/lib/content";
import { MDXRemote } from "next-mdx-remote-client/rsc";

export async function generateStaticParams() {
  return getAllServices().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};
  return {
    title: `${service.title} — dinkbit`,
    description: service.shortDescription,
  };
}

export default async function ServiceDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  return (
    <article>
      <header className="border-b border-[--color-border] bg-[--color-bg-subtle] py-24">
        <Container>
          <p className="text-sm font-medium text-[--color-accent]">Servicio</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
            {service.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[--color-fg-muted]">
            {service.shortDescription}
          </p>
        </Container>
      </header>
      <Container className="prose prose-invert max-w-3xl py-16">
        <MDXRemote source={service.body} />
      </Container>
    </article>
  );
}
