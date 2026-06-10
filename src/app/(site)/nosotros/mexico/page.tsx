import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { TeamGridMexico } from "@/components/nosotros/TeamGrid";

export const metadata = {
  title: "Equipo en México — dinkbit",
  description:
    "Conoce al equipo de dinkbit en México: especialistas in-house en desarrollo, paid media, SEO y diseño.",
};

export default function NosotrosMexicoPage() {
  return (
    <>
      <Container className="pt-12 md:pt-16">
        <Link
          href="/nosotros"
          className="inline-flex items-center gap-2 text-sm font-medium text-fg-muted transition-colors hover:text-accent"
        >
          <span aria-hidden>←</span> Volver a Nosotros
        </Link>
      </Container>

      <TeamGridMexico />
    </>
  );
}
