import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { getAllServices } from "@/lib/content";

export function ServicesGrid() {
  const services = getAllServices();
  return (
    <section className="py-24">
      <Container>
        <p className="text-sm font-medium text-[--color-accent]">Nuestros servicios</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          Todo lo que necesita una marca para crecer en digital.
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Link
              key={s.slug}
              href={`/servicios/${s.slug}`}
              className="group rounded-2xl border border-[--color-border] bg-[--color-bg-elevated] p-6 transition-colors hover:border-[--color-accent]"
            >
              <Image
                src={`/img/icons/servicios/${s.slug}.png`}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10"
              />
              <p className="mt-4 text-lg font-semibold text-[--color-fg]">{s.title}</p>
              <p className="mt-2 text-sm text-[--color-fg-muted]">{s.shortDescription}</p>
              <p className="mt-4 text-sm font-medium text-[--color-accent]">
                Conocer más →
              </p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
