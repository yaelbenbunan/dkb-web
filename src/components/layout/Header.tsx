import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { NAV_ITEMS } from "@/lib/nav";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight text-[--color-accent]">
          dinkbit
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.filter((i) => i.href !== "/contacto").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-slate-700 transition-colors hover:text-[--color-primary]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block">
          <ButtonLink href="/contacto" size="sm">
            Contacto
          </ButtonLink>
        </div>
        <MobileMenu />
      </Container>
    </header>
  );
}
