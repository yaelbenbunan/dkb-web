import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import type { CaseStudy } from "@/lib/types";

export function RelatedCases({ cases }: { cases: CaseStudy[] }) {
  if (cases.length === 0) return null;
  return (
    <section className="border-t border-[--color-border] bg-[--color-bg-subtle] py-20 md:py-24">
      <Container>
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Otros casos de éxito
          </h2>
          <Link
            href="/casos-de-exito"
            className="text-sm font-medium text-[--color-accent] hover:text-[--color-accent-hover]"
          >
            Ver todos →
          </Link>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {cases.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/casos-de-exito/${c.slug}`}
                className="group flex aspect-[4/3] items-center justify-center rounded-2xl border border-[--color-border] bg-[--color-bg-elevated] p-6 transition-all hover:-translate-y-1 hover:border-[--color-accent]"
              >
                {c.clientLogo ? (
                  <Image
                    src={c.clientLogo}
                    alt={c.client}
                    width={140}
                    height={56}
                    className="max-h-12 w-auto object-contain opacity-80 transition group-hover:opacity-100"
                  />
                ) : (
                  <span className="font-medium text-[--color-fg]">
                    {c.client}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
