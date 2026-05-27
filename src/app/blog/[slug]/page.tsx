import Script from "next/script";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PostHero } from "@/components/blog/PostHero";
import { PostBody } from "@/lib/blog-markdown";
import { PostToc } from "@/components/blog/PostToc";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import {
  Breadcrumbs,
  buildBreadcrumbSchema,
} from "@/components/ui/Breadcrumbs";
import { extractHeadings } from "@/lib/blog-markdown";
import { getAllPosts, getPostBySlug, getRelatedPosts } from "@/lib/content";

const SITE_URL = "https://www.dinkbit.es";

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  const url = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.excerpt,
      siteName: "dinkbit",
      publishedTime: post.publishedAt,
      authors: [post.author.name],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const headings = extractHeadings(post.body);
  const related = getRelatedPosts(slug, 3);

  const breadcrumbItems = [
    { label: "Inicio", href: "/" },
    { label: "Blog", href: "/blog" },
    { label: post.title },
  ];

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    url: `${SITE_URL}/blog/${post.slug}`,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    inLanguage: "es-ES",
    image: `${SITE_URL}/blog/${post.slug}/opengraph-image`,
    author: {
      "@type": "Person",
      name: post.author.name,
      ...(post.author.role ? { jobTitle: post.author.role } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: "dinkbit",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` },
    },
    keywords: post.tags.join(", "),
  };

  const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbItems);

  return (
    <article>
      <Script
        id={`ld-article-${post.slug}`}
        type="application/ld+json"
        strategy="beforeInteractive"
      >
        {JSON.stringify(articleSchema).replace(/</g, "\\u003c")}
      </Script>
      <Script
        id={`ld-breadcrumb-${post.slug}`}
        type="application/ld+json"
        strategy="beforeInteractive"
      >
        {JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c")}
      </Script>

      <Container className="pt-8">
        <Breadcrumbs items={breadcrumbItems} />
      </Container>

      <PostHero post={post} />

      <Container className="py-16 md:py-24">
        <div className="grid gap-14 lg:grid-cols-[1fr_240px] lg:gap-20">
          <div className="min-w-0 max-w-2xl">
            <PostBody body={post.body} team={post.team} />

            {/* Cierre CTA */}
            <div className="mt-20 rounded-2xl border border-accent/30 bg-accent/10 p-8 md:p-10">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-accent">
                ¿Te ayudamos?
              </p>
              <p
                className="mt-3 font-black leading-tight tracking-tight"
                style={{ fontSize: "var(--text-display-sm)" }}
              >
                Cuéntanos tu proyecto.
              </p>
              <p className="mt-4 text-fg-muted">
                Si lo que has leído te ha sonado a tu negocio, escríbenos. Sin
                compromiso y sin discurso comercial.
              </p>
              <a
                href="/contacto"
                className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-white shadow-[0_10px_30px_-10px_rgba(24,123,239,0.6)] transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
              >
                Hablar con el equipo →
              </a>
            </div>
          </div>

          {/* Aside con TOC sticky en desktop */}
          {headings.length > 1 && (
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <PostToc headings={headings} />
              </div>
            </aside>
          )}
        </div>
      </Container>

      <RelatedPosts posts={related} />
    </article>
  );
}
