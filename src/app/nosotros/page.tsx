import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Nosotros — dinkbit",
  description: "Quiénes somos. Agencia digital con sede en España.",
};

export default function NosotrosPage() {
  return (
    <article>
      <header className="bg-slate-50 py-24">
        <Container>
          <p className="text-sm font-medium text-[--color-accent]">Nosotros</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
            Una agencia digital, hecha para construir.
          </h1>
        </Container>
      </header>
      <Container className="prose prose-slate max-w-3xl py-16">
        <p>Texto provisional. A redactar con los textos reales del cliente.</p>
        <h2>Cómo trabajamos</h2>
        <p>Texto provisional.</p>
        <h2>Equipo</h2>
        <p>Texto provisional.</p>
      </Container>
    </article>
  );
}
