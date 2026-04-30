import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { NAV_ITEMS } from "@/lib/nav";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-[#0e1015]/80 backdrop-blur-xl">
      <Container className="flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center" aria-label="dinkbit — inicio">
          <Image
            src="/img/logo/dinkbit.svg"
            alt="dinkbit"
            width={140}
            height={36}
            priority
            className="h-9 w-auto"
          />
        </Link>
        <nav className="hidden items-center gap-10 md:flex">
          {NAV_ITEMS.filter((i) => i.href !== "/contacto").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-base text-[--color-fg-muted] transition-colors hover:text-[--color-fg]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block">
          <ButtonLink href="/contacto" size="md">
            Contacto
          </ButtonLink>
        </div>
        <MobileMenu />
      </Container>
    </header>
  );
}
