import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { getAllServices } from "@/lib/content";

export function ServicesGrid() {
  const services = getAllServices();
  return (
    <section className="py-24">
      <Container>
        <h2 className="text-3xl font-bold tracking-tight">Servicios</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Todo lo que necesita una marca para crecer en digital.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Link
              key={s.slug}
              href={`/servicios/${s.slug}`}
              className="group rounded-2xl border border-slate-200 p-6 transition-colors hover:border-[--color-accent]"
            >
              <p className="text-lg font-semibold">{s.title}</p>
              <p className="mt-2 text-sm text-slate-600">{s.shortDescription}</p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
