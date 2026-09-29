import { Container } from "@/components/ui/Container";
import { ServiceCard } from "@/components/servicios/ServiceCard";
import { Reveal } from "@/components/ui/Reveal";
import { getAllServices } from "@/lib/content";

export const metadata = {
  title: "Servicios — dinkbit",
  description:
    "Desarrollo web, ecommerce, diseño gráfico, paid media, SEM, SEO y email marketing.",
};

const SITE_URL = "https://www.dinkbit.es";

export default function ServiciosPage() {
  const services = getAllServices();

  /**
   * `ItemList` del catálogo. Sin esto, una IA que quiera saber qué ofrece
   * dinkbit tiene que entrar en las nueve páginas de servicio una a una y
   * deducir la lista; con esto la lee entera de una lectura, con el nombre, la
   * descripción y la URL de cada uno. Es la diferencia entre que pueda
   * enumerar tus servicios y que recuerde dos.
   *
   * Cada elemento va como `Service` y no como un enlace suelto, y apunta al
   * `@id` de la organización del layout: así los nueve cuelgan de la misma
   * entidad y no parecen de nueve proveedores distintos.
   */
  const catalogoSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Servicios de dinkbit",
    numberOfItems: services.length,
    itemListElement: services.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        name: s.title,
        description: s.shortDescription,
        url: `${SITE_URL}/servicios/${s.slug}`,
        provider: { "@id": `${SITE_URL}/#organizacion` },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(catalogoSchema).replace(/</g, "\\u003c") }}
      />
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
          {services.map((s, i) => (
            <Reveal
              key={s.slug}
              delay={Math.min(i, 6) * 0.08}
              distance={28}
              scale
              className="h-full"
            >
              <ServiceCard service={s} />
            </Reveal>
          ))}
        </div>
      </Container>
    </>
  );
}
