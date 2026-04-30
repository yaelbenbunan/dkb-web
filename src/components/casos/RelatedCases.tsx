import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import type { CaseStudy } from "@/lib/types";

export function RelatedCases({ cases }: { cases: CaseStudy[] }) {
  if (cases.length === 0) return null;
  return (
    <section className="relative isolate overflow-hidden bg-[--color-bg-deep] py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-dots opacity-30"
      />
      <Container>
        <div className="flex items-end justify-between">
          <h2
            className="font-black leading-[1.05] tracking-tight"
            style={{ fontSize: "var(--text-display-md)" }}
          >
            Otros{" "}
            <span className="italic text-[--color-accent]">casos de éxito.</span>
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
                className="surface surface-hover group flex aspect-[4/3] items-center justify-center rounded-2xl p-6 transition-all hover:-translate-y-1"
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
