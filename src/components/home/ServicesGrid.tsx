import Link from "next/link";
import { Container } from "@/components/ui/Container";

const SERVICES = [
  { title: "Desarrollo web", slug: "desarrollo-web" },
  { title: "Ecommerce", slug: "ecommerce" },
  { title: "Diseño gráfico", slug: "diseno-grafico" },
  { title: "Social & Paid Media", slug: "social-paid-media" },
  { title: "SEM", slug: "sem" },
  { title: "SEO", slug: "seo" },
  { title: "Email mkt", slug: "email-mkt" },
];

export function ServicesGrid() {
  return (
    <section className="py-24">
      <Container>
        <h2 className="text-3xl font-bold tracking-tight">Servicios</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Todo lo que necesita una marca para crecer en digital.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Link
              key={s.slug}
              href={`/servicios/${s.slug}`}
              className="group rounded-2xl border border-slate-200 p-6 transition-colors hover:border-[--color-accent]"
            >
              <p className="text-lg font-semibold">{s.title}</p>
              <p className="mt-2 text-sm text-slate-600 group-hover:text-slate-900">
                Conocer más →
              </p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
