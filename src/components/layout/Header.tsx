import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { NAV_ITEMS } from "@/lib/nav";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[--color-border] bg-[#0b0b0b]/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center" aria-label="dinkbit — inicio">
          <Image
            src="/img/logo/dinkbit.svg"
            alt="dinkbit"
            width={108}
            height={28}
            priority
            className="h-7 w-auto"
          />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.filter((i) => i.href !== "/contacto").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-[--color-fg-muted] transition-colors hover:text-[--color-fg]"
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
