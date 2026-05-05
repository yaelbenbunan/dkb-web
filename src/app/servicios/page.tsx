import { Container } from "@/components/ui/Container";
import { ServiceCard } from "@/components/servicios/ServiceCard";
import { getAllServices } from "@/lib/content";

export const metadata = {
  title: "Servicios — dinkbit",
  description:
    "Desarrollo web, ecommerce, diseño gráfico, paid media, SEM, SEO y email marketing.",
};

export default function ServiciosPage() {
  const services = getAllServices();
  return (
    <>
      <header className="relative isolate overflow-hidden py-20 md:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
          style={{ ["--sx" as string]: "30%", ["--sy" as string]: "40%" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-40 fade-edges-y"
        />
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Servicios
          </p>
          <h1
            className="mt-6 max-w-3xl font-black leading-[1] tracking-tight"
            style={{ fontSize: "var(--text-display-lg)" }}
          >
            Todo lo que necesita una marca para{" "}
            <span className="text-accent">crecer en la era digital.</span>
          </h1>
        </Container>
      </header>
      <Container className="pb-24 md:pb-28">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.slug} service={s} />
          ))}
        </div>
      </Container>
    </>
  );
}
