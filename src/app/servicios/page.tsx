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
    <Container className="py-24">
      <h1 className="text-4xl font-bold tracking-tight">Servicios</h1>
      <p className="mt-4 max-w-2xl text-slate-600">
        Todo lo que necesita una marca para crecer en digital.
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <ServiceCard key={s.slug} service={s} />
        ))}
      </div>
    </Container>
  );
}
