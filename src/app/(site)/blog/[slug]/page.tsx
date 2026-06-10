import Script from "next/script";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PostHero } from "@/components/blog/PostHero";
import { PostBody } from "@/lib/blog-markdown";
import { PostToc } from "@/components/blog/PostToc";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import { PostAsideLinks } from "@/components/blog/PostAsideLinks";
import { PostAsideCta } from "@/components/blog/PostAsideCta";
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
  const allPosts = getAllPosts();

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
        <div className="grid gap-14 lg:grid-cols-[1fr_280px] lg:gap-16 xl:gap-20">
          <div className="min-w-0 max-w-2xl">
            <PostBody body={post.body} team={post.team} />
          </div>

          {/* Aside sticky en desktop: TOC + otros artículos + CTA mini */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-10">
              {headings.length > 1 && <PostToc headings={headings} />}
              <PostAsideLinks posts={allPosts} currentSlug={post.slug} />
              <PostAsideCta />
            </div>
          </aside>

          {/* CTA mobile (solo bajo lg) */}
          <div className="lg:hidden">
            <PostAsideCta />
          </div>
        </div>
      </Container>

      <RelatedPosts posts={related} />
    </article>
  );
}
