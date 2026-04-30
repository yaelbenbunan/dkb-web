import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export function ContactCTA() {
  return (
    <section className="bg-[--color-primary] py-24 text-white">
      <Container className="text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          ¿Tienes un proyecto en mente?
        </h2>
        <p className="mt-4 text-slate-300">Te respondemos en menos de 24 horas.</p>
        <div className="mt-8">
          <ButtonLink href="/contacto" size="lg">
            Hablemos
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
