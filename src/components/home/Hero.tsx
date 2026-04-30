import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export function Hero() {
  return (
    <section className="bg-slate-50">
      <Container className="py-24 md:py-32">
        <p className="text-sm font-medium text-[--color-accent]">dinkbit · España</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-6xl">
          Marketing digital que <span className="text-[--color-accent]">convierte</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-600">
          Diseño, desarrollo y campañas para marcas que quieren resultados medibles.
          Llevamos más de [N] años haciendo crecer negocios online.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <ButtonLink href="/contacto" size="lg">
            Hablemos
          </ButtonLink>
          <ButtonLink href="/servicios" size="lg" variant="ghost">
            Ver servicios
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
