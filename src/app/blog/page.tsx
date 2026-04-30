import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Blog — dinkbit",
  description: "El blog de dinkbit. Próximamente.",
  robots: { index: false },
};

export default function BlogPage() {
  return (
    <Container className="py-32 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Próximamente</h1>
      <p className="mt-4 text-slate-600">
        Estamos preparando el blog. Vuelve pronto.
      </p>
    </Container>
  );
}
