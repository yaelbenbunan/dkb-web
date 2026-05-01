"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  href: string;
  children: React.ReactNode;
}

export function NavLink({ href, children }: Props) {
  const pathname = usePathname();
  // Active si la ruta es exacta o si es subruta (servicios/[slug] → marca Servicios)
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`group relative inline-flex h-16 items-center px-1 text-base font-medium transition-colors ${
        isActive
          ? "text-[#3a90f2]"
          : "text-[--color-fg-muted] hover:text-[--color-fg]"
      }`}
    >
      {/* Glow detrás del texto activo */}
      {isActive && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 -z-10 h-8 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse 80% 100% at 50% 50%, rgba(58,144,242,0.35), transparent 70%)",
          }}
        />
      )}

      <span className="relative">{children}</span>

      {/* Underline animado: scale-x:0 inactivo, 1 activo, hover-grow */}
      <span
        aria-hidden
        className={`absolute inset-x-0 -bottom-px h-0.5 origin-center transition-transform duration-300 ${
          isActive
            ? "scale-x-100 bg-gradient-to-r from-transparent via-[#3a90f2] to-transparent"
            : "scale-x-0 bg-gradient-to-r from-transparent via-[#187bef] to-transparent group-hover:scale-x-100"
        }`}
      />

    </Link>
  );
}
