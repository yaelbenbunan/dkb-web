import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { WebExpressBriefForm } from "@/components/web-express/WebExpressBriefForm";
import { BRIEFS, briefBySlug } from "@/lib/web-express-brief";

export function generateStaticParams() {
  return BRIEFS.map((b) => ({ nicho: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ nicho: string }>;
}): Promise<Metadata> {
  const brief = briefBySlug((await params).nicho);
  if (!brief) return {};
  return {
    title: brief.metaTitle,
    // El enlace se manda por email a quien ya es cliente: no interesa que esto
    // aparezca en buscadores ni compita con las landings.
    robots: { index: false, follow: false },
  };
}

export default async function CuestionarioPage({
  params,
}: {
  params: Promise<{ nicho: string }>;
}) {
  const brief = briefBySlug((await params).nicho);
  if (!brief) notFound();

  return (
    <div style={{ background: "#FBF8F4", color: "#0B1020" }}>
      <Container className="max-w-3xl py-14">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{brief.title}</h1>
        <p className="mt-3 text-lg leading-relaxed" style={{ color: "#5A6178" }}>
          {brief.intro}
        </p>
        <div className="mt-10">
          <WebExpressBriefForm brief={brief} />
        </div>
      </Container>
    </div>
  );
}
