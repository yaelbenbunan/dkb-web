import Link from "next/link";
import { Container } from "@/components/ui/Container";

export function FeaturedCases() {
  return (
    <section className="bg-slate-50 py-24">
      <Container>
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Casos de éxito</h2>
          <Link
            href="/casos-de-exito"
            className="text-sm font-medium text-[--color-accent]"
          >
            Ver todos →
          </Link>
        </div>
        <p className="mt-4 text-slate-600">
          Próximamente, una selección de los proyectos que más nos han marcado.
        </p>
      </Container>
    </section>
  );
}
